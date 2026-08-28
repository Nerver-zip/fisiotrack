#include "../include/clinic/api_server.hpp"
#include <nlohmann/json.hpp>
#include <iostream>
#include <fstream>
#include <cctype>
#include <cstdlib>

namespace clinic {

using json = nlohmann::json;

namespace {

std::string host_from_url(const std::string& value) {
    auto start = value.find("://");
    start = start == std::string::npos ? 0 : start + 3;
    auto end = value.find('/', start);
    std::string authority = value.substr(start, end - start);
    if (!authority.empty() && authority.front() == '[') {
        const auto bracket = authority.find(']');
        return bracket == std::string::npos ? authority : authority.substr(0, bracket + 1);
    }
    const auto colon = authority.rfind(':');
    return colon == std::string::npos ? authority : authority.substr(0, colon);
}

bool password_is_strong(const std::string& password) {
    if (password.size() < 8) return false;
    bool lower = false;
    bool upper = false;
    bool digit = false;
    for (const unsigned char ch : password) {
        lower = lower || std::islower(ch);
        upper = upper || std::isupper(ch);
        digit = digit || std::isdigit(ch);
    }
    return lower && upper && digit;
}

std::filesystem::path oauth_secrets_path(const std::filesystem::path& root) {
    if (const char* configured_path = std::getenv("GOOGLE_OAUTH_CLIENT_SECRETS")) {
        std::filesystem::path path(configured_path);
        return path.is_relative() ? root / path : path;
    }
    return root / "config" / "client_secrets.json";
}

std::string oauth_redirect_uri() {
    if (const char* configured_uri = std::getenv("OAUTH_REDIRECT_URI")) {
        return configured_uri;
    }
    return "http://127.0.0.1:8080/oauth-callback";
}

} // namespace

ApiServer::ApiServer(std::shared_ptr<PatientRepository> repo)
    : ApiServer(std::move(repo), std::filesystem::current_path()) {}

ApiServer::ApiServer(std::shared_ptr<PatientRepository> repo, const std::filesystem::path& root_path)
    : m_repo(std::move(repo)), m_backup_manager(m_repo), m_root_path(root_path) {
    m_backup_manager.set_project_root(root_path);
    setup_cors();
    setup_routes();

    const auto frontend_build = root_path / "frontend" / "build";
    if (std::filesystem::exists(frontend_build / "index.html")) {
        m_svr.set_mount_point("/", frontend_build.string());
        m_svr.Get("/oauth-callback", [frontend_build](const httplib::Request&, httplib::Response& res) {
            std::ifstream input(frontend_build / "index.html", std::ios::binary);
            res.set_content(std::string(std::istreambuf_iterator<char>(input), {}), "text/html; charset=utf-8");
        });
    }
}

bool ApiServer::listen(const std::string& host, int port) {
    std::cout << "FisioTrack disponível em http://" << host << ":" << port << std::endl;
    return m_svr.listen(host.c_str(), port);
}

void ApiServer::stop() {
    m_svr.stop();
}

void ApiServer::setup_cors() {
    m_svr.set_post_routing_handler([](const auto& req, auto& res) {
        const std::string origin = req.get_header_value("Origin");
        const std::string request_host = host_from_url(req.get_header_value("Host"));
        const std::string origin_host = host_from_url(origin);
        const bool loopback_dev = origin == "http://localhost:3000" || origin == "http://127.0.0.1:3000";
        if (!origin.empty() && (loopback_dev || (!request_host.empty() && request_host == origin_host))) {
            res.set_header("Access-Control-Allow-Origin", origin);
            res.set_header("Vary", "Origin");
        }
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    });

    m_svr.Options(R"(/api/.*)", []([[maybe_unused]] const auto& req, auto& res) {
        res.status = 200;
    });
}

bool ApiServer::is_authorized(const httplib::Request& req) {
    if (!m_repo->is_authenticated()) return false;
    auto auth_header = req.get_header_value("Authorization");
    if (auth_header.find("Bearer ") != 0) return false;
    return m_session_manager.validate_session(auth_header.substr(7));
}

void ApiServer::setup_routes() {
    // --- Autenticação da instalação ---

    m_svr.Get("/api/auth/status", [this](const httplib::Request&, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(m_repository_mutex);
        res.set_content(json({{"initialized", m_repo->is_initialized()}}).dump(), "application/json");
    });

    m_svr.Post("/api/auth/setup", [this](const httplib::Request& req, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(m_repository_mutex);
        if (m_repo->is_initialized()) {
            res.status = 400;
            res.set_content(json({{"error", "O banco já foi configurado. Faça login."}}).dump(), "application/json");
            return;
        }
        try {
            auto body = json::parse(req.body);
            std::string password = body.value("password", "");
            if (!password_is_strong(password)) {
                res.status = 400;
                res.set_content(json({{"error", "Use ao menos 8 caracteres, com maiúscula, minúscula e número."}}).dump(), "application/json");
                return;
            }
            if (m_repo->authenticate(password)) {
                std::string token = m_session_manager.create_session();
                res.status = 201;
                res.set_content(json({{"token", token}}).dump(), "application/json");
            } else {
                res.status = 500;
                res.set_content(json({{"error", "Falha ao criar o banco de dados."}}).dump(), "application/json");
            }
        } catch (...) {
            res.status = 400;
        }
    });

    m_svr.Post("/api/login", [this](const httplib::Request& req, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(m_repository_mutex);
        try {
            auto body = json::parse(req.body);
            std::string password = body.value("password", "");
            if (password.empty()) {
                res.status = 400;
                res.set_content(json({{"error", "Informe a senha."}}).dump(), "application/json");
                return;
            }
            if (m_repo->authenticate(password)) {
                std::string token = m_session_manager.create_session();
                res.status = 200;
                res.set_content(json({{"token", token}}).dump(), "application/json");
            } else {
                res.status = 401;
                res.set_content(json({{"error", "Senha incorreta ou banco inacessível."}}).dump(), "application/json");
            }
        } catch (...) {
            res.status = 400;
        }
    });

    m_svr.Post("/api/logout", [this](const httplib::Request& req, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(m_repository_mutex);
        auto auth_header = req.get_header_value("Authorization");
        if (auth_header.find("Bearer ") == 0) {
            std::string token = auth_header.substr(7);
            m_session_manager.invalidate_session(token);
        }
        if (m_session_manager.active_sessions_count() == 0 && m_repo->is_authenticated()) {
            m_repo->logout();
        }
        res.status = 200;
        res.set_content(json({{"status", "logged out"}}).dump(), "application/json");
    });

    // --- Middleware-like check para todas as outras rotas ---

    auto wrap_auth = [this](auto handler) {
        return [this, handler](const httplib::Request& req, httplib::Response& res) {
            std::lock_guard<std::mutex> lock(m_repository_mutex);
            if (m_session_manager.active_sessions_count() == 0 && m_repo->is_authenticated()) {
                m_repo->logout();
            }
            if (!is_authorized(req)) {
                res.status = 401;
                res.set_content(json({{"error", "Não autorizado. Faça login."}}).dump(), "application/json");
                return;
            }
            auto auth = req.get_header_value("Authorization");
            const std::string actor = auth.size() > 15 ? "session_" + auth.substr(7, 8) : "session";
            handler(req, res, m_repo, actor);
        };
    };

    // Listar / Buscar pacientes
    m_svr.Get("/api/patients", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, [[maybe_unused]] const std::string& actor) {
        auto query = req.get_param_value("q");
        auto patients = query.empty() ? repo->get_all_patients() : repo->search_patients(query);
        res.set_content(json(patients).dump(), "application/json");
    }));

    m_svr.Get("/api/patients/export", wrap_auth([this]([[maybe_unused]] const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, [[maybe_unused]] const std::string& actor) {
        auto patients = repo->get_all_patients_full();
        res.set_content(json(patients).dump(), "application/json");
    }));

    // Listar logs de auditoria
    m_svr.Get("/api/audit", wrap_auth([this]([[maybe_unused]] const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, [[maybe_unused]] const std::string& actor) {
        auto logs = repo->get_audit_logs();
        res.set_content(json(logs).dump(), "application/json");
    }));

    // --- Backup & Cloud ---
    m_svr.Post("/api/backup", wrap_auth([this]([[maybe_unused]] const httplib::Request& req, httplib::Response& res, [[maybe_unused]] std::shared_ptr<PatientRepository> repo, [[maybe_unused]] const std::string& actor) {
        auto backup = m_backup_manager.run_backup();
        if (backup.local_success) {
            res.set_content(json({{"status", "ok"}, {"file", backup.local_path}, {"upload", backup.upload_success}}).dump(), "application/json");
        } else {
            res.status = 500;
            res.set_content(json({{"error", backup.error_message.empty() ? "Falha ao gerar backup local" : backup.error_message}}).dump(), "application/json");
        }
    }));

    m_svr.Get("/api/backup/config", wrap_auth([](const httplib::Request&, httplib::Response& res, std::shared_ptr<PatientRepository> repo, [[maybe_unused]] const std::string& actor) {
        auto config = repo->get_cloud_config();
        if (config) {
            json j = *config;
            j.erase("refresh_token"); // Segurança: não expor o token no GET
            j["has_token"] = !config->refresh_token.empty();
            res.set_content(j.dump(), "application/json");
        } else {
            res.set_content(json({{"provider", "google_drive"}, {"folder_id", ""}, {"is_enabled", false}, {"has_token", false}}).dump(), "application/json");
        }
    }));

    m_svr.Post("/api/backup/config", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, const std::string& actor) {
        try {
            auto j = json::parse(req.body);
            auto current = repo->get_cloud_config().value_or(CloudConfig{});

            if (j.contains("is_enabled")) current.is_enabled = j["is_enabled"];
            if (j.contains("folder_id")) current.folder_id = j["folder_id"];

            if (repo->update_cloud_config(current, actor)) {
                res.set_content(json({{"status", "ok"}}).dump(), "application/json");
            } else {
                res.status = 500;
            }
        } catch(...) { res.status = 400; }
    }));

    m_svr.Get("/api/backup/auth/url", wrap_auth([this]([[maybe_unused]] const httplib::Request& req, httplib::Response& res, [[maybe_unused]] std::shared_ptr<PatientRepository> repo, [[maybe_unused]] const std::string& actor) {
        const auto secrets_path = oauth_secrets_path(m_root_path);
        std::ifstream f(secrets_path);
        if (!f.is_open()) {
            std::cerr << "ERRO: Nao foi possivel abrir " << secrets_path << std::endl;
            res.status = 500;
            res.set_content(json({{"error", "Credencial OAuth do Google não encontrada."}}).dump(), "application/json");
            return;
        }
        try {
            auto secrets = json::parse(f);
            if (!secrets.contains("installed")) {
                std::cerr << "ERRO: use credenciais OAuth do tipo aplicativo para computador" << std::endl;
                res.status = 500;
                res.set_content(json({{"error", "Use uma credencial OAuth do tipo aplicativo para computador."}}).dump(), "application/json");
                return;
            }

            std::string client_id = secrets["installed"]["client_id"];

            std::string scope = "https://www.googleapis.com/auth/drive.file";
            const std::string redirect_uri = oauth_redirect_uri();

            std::string auth_url = "https://accounts.google.com/o/oauth2/v2/auth?"
                                   "client_id=" + client_id +
                                   "&redirect_uri=" + redirect_uri +
                                   "&response_type=code" +
                                   "&scope=" + scope +
                                   "&access_type=offline" +
                                   "&prompt=consent";

            res.set_content(json({{"url", auth_url}}).dump(), "application/json");
        } catch (const std::exception& e) {
            std::cerr << "ERRO ao processar JSON: " << e.what() << std::endl;
            res.status = 500;
            res.set_content(json({{"error", "Não foi possível ler a credencial OAuth."}}).dump(), "application/json");
        }
    }));

    m_svr.Post("/api/backup/auth/callback", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, const std::string& actor) {
        try {
            auto j_req = json::parse(req.body);
            std::string code = j_req.at("code");

            std::ifstream f(oauth_secrets_path(m_root_path));
            if (!f.is_open()) {
                res.status = 500;
                res.set_content(json({{"error", "Credencial OAuth do Google não encontrada."}}).dump(), "application/json");
                return;
            }
            auto secrets = json::parse(f);

            if (!secrets.contains("installed")) {
                res.status = 500;
                res.set_content(json({{"error", "client_secrets.json invalido"}}).dump(), "application/json");
                return;
            }
            std::string client_id = secrets["installed"]["client_id"];
            std::string client_secret = secrets["installed"]["client_secret"];

            const std::string redirect_uri = oauth_redirect_uri();

            httplib::Client cli("https://oauth2.googleapis.com");
            httplib::Params params;
            params.emplace("client_id", client_id);
            params.emplace("client_secret", client_secret);
            params.emplace("code", code);
            params.emplace("grant_type", "authorization_code");
            params.emplace("redirect_uri", redirect_uri);

            auto token_res = cli.Post("/token", params);
            if (token_res && token_res->status == 200) {
                auto j_token = json::parse(token_res->body);
                if (!j_token.contains("refresh_token")) {
                    std::cerr << "ERRO: Google nao retornou refresh_token. Verifique se o app ja estava autorizado e use prompt=consent." << std::endl;
                    res.status = 400;
                    res.set_content(json({{"error", "Google nao retornou refresh_token. Tente desconectar e conectar novamente."}}).dump(), "application/json");
                    return;
                }
                std::string refresh_token = j_token.at("refresh_token");

                auto config = repo->get_cloud_config().value_or(CloudConfig{});
                config.refresh_token = refresh_token;
                config.is_enabled = true;

                if (repo->update_cloud_config(config, actor)) {
                    res.set_content(json({{"status", "ok"}}).dump(), "application/json");
                } else {
                    res.status = 500;
                    res.set_content(json({{"error", "Falha ao salvar config no banco"}}).dump(), "application/json");
                }
            } else {
                std::string err_body = token_res ? token_res->body : "Sem resposta do Google";
                std::cerr << "ERRO na troca do token: " << (token_res ? std::to_string(token_res->status) : "500") << " - " << err_body << std::endl;
                res.status = 400;
                res.set_content(err_body, "application/json");
            }
        } catch(const std::exception& e) {
            res.status = 500;
            res.set_content(json({{"error", e.what()}}).dump(), "application/json");
        }
    }));

    // Detalhes de um paciente
    m_svr.Get(R"(/api/patients/(\d+))", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, [[maybe_unused]] const std::string& actor) {
        int id = std::stoi(req.matches[1]);
        auto p = repo->get_patient(id);
        if (p) {
            res.set_content(json(*p).dump(), "application/json");
        } else {
            res.status = 404;
        }
    }));

    // Histórico de agendamentos de um paciente
    m_svr.Get(R"(/api/patients/(\d+)/appointments)", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, [[maybe_unused]] const std::string& actor) {
        int patient_id = std::stoi(req.matches[1]);
        auto appts = repo->get_patient_appointments(patient_id);
        res.set_content(json(appts).dump(), "application/json");
    }));

    // Criar novo paciente
    m_svr.Post("/api/patients", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, const std::string& actor) {
        try {
            auto p = json::parse(req.body).get<Patient>();
            if (repo->add_patient(p, actor)) {
                res.status = 201;
                res.set_content(json({{"status", "ok"}}).dump(), "application/json");
            } else {
                res.status = 500;
            }
        } catch (...) {
            res.status = 400;
        }
    }));

    // Atualizar paciente existente
    m_svr.Put(R"(/api/patients/(\d+))", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, const std::string& actor) {
        try {
            int id = std::stoi(req.matches[1]);
            auto existing_opt = repo->get_patient(id);
            if (!existing_opt) {
                res.status = 404;
                return;
            }

            json patch = json::parse(req.body);
            Patient p = *existing_opt;

            if (patch.contains("healthcare_id")) p.healthcare_id = patch["healthcare_id"];
            if (patch.contains("name")) p.name = patch["name"];
            if (patch.contains("mom_name")) p.mom_name = patch["mom_name"];
            if (patch.contains("birth_date")) p.birth_date = patch["birth_date"];
            if (patch.contains("cpf")) p.cpf = patch["cpf"];
            if (patch.contains("gender")) p.gender = patch["gender"];
            if (patch.contains("address")) p.address = patch["address"];
            if (patch.contains("profession")) p.profession = patch["profession"];
            if (patch.contains("is_favorite")) p.is_favorite = patch["is_favorite"].get<bool>();
            if (patch.contains("phone")) p.phone = patch["phone"].get<std::vector<std::string>>();

            if (repo->update_patient(p, actor)) {
                res.status = 200;
                res.set_content(json({{"status", "ok"}}).dump(), "application/json");
            } else {
                res.status = 500;
            }
        } catch (...) {
            res.status = 400;
        }
    }));

    // Importar pacientes (JSON)
    m_svr.Post("/api/patients/import", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, const std::string& actor) {
        try {
            auto patients = json::parse(req.body).get<std::vector<Patient>>();
            repo->import_patients(patients, actor);
            res.status = 201;
            res.set_content(json({{"status", "ok"}}).dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(json({{"error", e.what()}}).dump(), "application/json");
        } catch (...) {
            res.status = 500;
        }
    }));

    // Remover paciente
    m_svr.Delete(R"(/api/patients/(\d+))", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, const std::string& actor) {
        int id = std::stoi(req.matches[1]);
        if (repo->delete_patient(id, actor)) {
            res.set_content(json({{"status", "deleted"}}).dump(), "application/json");
        } else {
            res.status = 500;
        }
    }));

    // --- Endpoints de Avaliações ---

    m_svr.Post(R"(/api/patients/(\d+)/evaluations)", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, const std::string& actor) {
        try {
            int patient_id = std::stoi(req.matches[1]);
            auto e = json::parse(req.body).get<Evaluation>();
            e.patient_id = patient_id;
            if (repo->add_evaluation(e, actor)) {
                res.status = 201;
                res.set_content(json({{"status", "ok"}}).dump(), "application/json");
            } else {
                res.status = 500;
            }
        } catch (...) {
            res.status = 400;
        }
    }));

    m_svr.Get(R"(/api/patients/(\d+)/evaluations)", wrap_auth([this]([[maybe_unused]] const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, [[maybe_unused]] const std::string& actor) {
        int patient_id = std::stoi(req.matches[1]);
        auto evals = repo->get_patient_evaluations(patient_id);
        res.set_content(json(evals).dump(), "application/json");
    }));

    m_svr.Put(R"(/api/patients/(\d+)/evaluations/(\d+))", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, const std::string& actor) {
        try {
            int patient_id = std::stoi(req.matches[1]);
            int eval_id = std::stoi(req.matches[2]);
            auto e = json::parse(req.body).get<Evaluation>();
            e.id = eval_id;
            e.patient_id = patient_id;
            if (repo->update_evaluation(e, actor)) {
                res.status = 200;
                res.set_content(json({{"status", "ok"}}).dump(), "application/json");
            } else {
                res.status = 500;
            }
        } catch (...) {
            res.status = 400;
        }
    }));

    m_svr.Delete(R"(/api/patients/(\d+)/evaluations/(\d+))", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, const std::string& actor) {
        int eval_id = std::stoi(req.matches[2]);
        if (repo->delete_evaluation(eval_id, actor)) {
            res.set_content(json({{"status", "deleted"}}).dump(), "application/json");
        } else {
            res.status = 500;
        }
    }));

    // --- Endpoints de Agendamentos ---

    m_svr.Get("/api/appointments", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, [[maybe_unused]] const std::string& actor) {
        std::string date = req.get_param_value("date");
        if (date.empty()) {
            res.status = 400;
            res.set_content(json({{"error", "date parameter is required"}}).dump(), "application/json");
            return;
        }
        auto appointments = repo->get_appointments(date);
        res.set_content(json(appointments).dump(), "application/json");
    }));

    m_svr.Post("/api/appointments", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, const std::string& actor) {
        try {
            auto a = json::parse(req.body).get<Appointment>();
            if (repo->add_appointment(a, actor)) {
                res.status = 201;
                res.set_content(json({{"status", "ok"}}).dump(), "application/json");
            } else {
                res.status = 500;
            }
        } catch (const std::exception& e) {
            std::cerr << "Erro no agendamento: " << e.what() << std::endl;
            res.status = 400;
        }
    }));

    m_svr.Put(R"(/api/appointments/(\d+))", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, const std::string& actor) {
        try {
            int id = std::stoi(req.matches[1]);
            auto a = json::parse(req.body).get<Appointment>();
            a.id = id;
            if (repo->update_appointment(a, actor)) {
                res.status = 200;
                res.set_content(json({{"status", "ok"}}).dump(), "application/json");
            } else {
                res.status = 500;
            }
        } catch (...) {
            res.status = 400;
        }
    }));

    m_svr.Delete(R"(/api/appointments/(\d+))", wrap_auth([this](const httplib::Request& req, httplib::Response& res, std::shared_ptr<PatientRepository> repo, const std::string& actor) {
        int id = std::stoi(req.matches[1]);
        if (repo->delete_appointment(id, actor)) {
            res.set_content(json({{"status", "deleted"}}).dump(), "application/json");
        } else {
            res.status = 500;
        }
    }));
}

} // namespace clinic
