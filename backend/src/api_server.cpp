#include "../include/clinic/api_server.hpp"
#include <nlohmann/json.hpp>
#include <iostream>

namespace clinic {

using json = nlohmann::json;

ApiServer::ApiServer(std::shared_ptr<PatientRepository> repo) : m_repo(std::move(repo)) {
    setup_cors();
    setup_routes();
}

void ApiServer::listen(const std::string& host, int port) {
    std::cout << "Servidor API FisioTrack rodando em http://" << host << ":" << port << std::endl;
    m_svr.listen(host.c_str(), port);
}

void ApiServer::stop() {
    m_svr.stop();
}

void ApiServer::setup_cors() {
    m_svr.set_post_routing_handler([](const auto& req, auto& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    });

    m_svr.Options(R"(/api/.*)", [](const auto& req, auto& res) {
        res.status = 200;
    });
}

bool ApiServer::is_authorized(const httplib::Request& req) {
    if (!m_repo->is_authenticated()) return false; // Banco fechado? Não autorizado.
    
    auto auth_header = req.get_header_value("Authorization");
    if (auth_header.find("Bearer ") != 0) return false;
    
    std::string token = auth_header.substr(7);
    return m_session_manager.validate_session(token);
}

void ApiServer::setup_routes() {
    // --- Autenticação (Zero-Knowledge) ---

    // Checa se o banco de dados já foi criado (com senha mestre)
    m_svr.Get("/api/auth/status", [this](const httplib::Request& req, httplib::Response& res) {
        bool init = m_repo->is_initialized();
        res.set_content(json({{"initialized", init}}).dump(), "application/json");
    });

    // Criação inicial do banco de dados (Primeiro Acesso)
    m_svr.Post("/api/auth/setup", [this](const httplib::Request& req, httplib::Response& res) {
        if (m_repo->is_initialized()) {
            res.status = 400;
            res.set_content(json({{"error", "Banco já inicializado. Faça login."}}).dump(), "application/json");
            return;
        }

        try {
            auto body = json::parse(req.body);
            std::string password = body.value("password", "");
            if (password.empty()) {
                res.status = 400;
                res.set_content(json({{"error", "Senha não pode ser vazia"}}).dump(), "application/json");
                return;
            }

            if (m_repo->authenticate(password)) {
                std::string token = m_session_manager.create_session();
                res.status = 201;
                res.set_content(json({{"token", token}}).dump(), "application/json");
            } else {
                res.status = 500;
                res.set_content(json({{"error", "Falha ao criar banco de dados"}}).dump(), "application/json");
            }
        } catch (...) {
            res.status = 400;
        }
    });

    m_svr.Post("/api/login", [this](const httplib::Request& req, httplib::Response& res) {
        try {
            auto body = json::parse(req.body);
            std::string password = body.value("password", "");
            
            if (m_repo->authenticate(password)) {
                std::string token = m_session_manager.create_session();
                res.status = 200;
                res.set_content(json({{"token", token}}).dump(), "application/json");
            } else {
                res.status = 401; // Unauthorized
                res.set_content(json({{"error", "Senha incorreta ou banco inacessível"}}).dump(), "application/json");
            }
        } catch (...) {
            res.status = 400;
        }
    });

    m_svr.Post("/api/logout", [this](const httplib::Request& req, httplib::Response& res) {
        auto auth_header = req.get_header_value("Authorization");
        if (auth_header.find("Bearer ") == 0) {
            std::string token = auth_header.substr(7);
            m_session_manager.invalidate_session(token);
        }

        // Se nenhuma sessão restou, fecha o banco para proteger a memória
        if (m_session_manager.active_sessions_count() == 0 && m_repo->is_authenticated()) {
            m_repo->logout();
        }

        res.status = 200;
        res.set_content(json({{"status", "logged out"}}).dump(), "application/json");
    });

    // --- Middleware-like check para todas as outras rotas ---
    
    auto wrap_auth = [this](auto handler) {
        return [this, handler](const httplib::Request& req, httplib::Response& res) {
            // Check geral: limpa sessões expiradas. Se zerar, tranca o banco.
            if (m_session_manager.active_sessions_count() == 0 && m_repo->is_authenticated()) {
                m_repo->logout();
            }

            if (!is_authorized(req)) {
                res.status = 401;
                res.set_content(json({{"error", "Não autorizado. Faça login."}}).dump(), "application/json");
                return;
            }
            handler(req, res);
        };
    };

    // Listar / Buscar pacientes
    m_svr.Get("/api/patients", wrap_auth([this](const httplib::Request& req, httplib::Response& res) {
        auto query = req.get_param_value("q");
        auto patients = query.empty() ? m_repo->get_all_patients() : m_repo->search_patients(query);
        res.set_content(json(patients).dump(), "application/json");
    }));

    // Detalhes de um paciente
    m_svr.Get(R"(/api/patients/(\d+))", wrap_auth([this](const httplib::Request& req, httplib::Response& res) {
        int id = std::stoi(req.matches[1]);
        auto p = m_repo->get_patient(id);
        if (p) {
            res.set_content(json(*p).dump(), "application/json");
        } else {
            res.status = 404;
        }
    }));

    // Criar novo paciente
    m_svr.Post("/api/patients", wrap_auth([this](const httplib::Request& req, httplib::Response& res) {
        try {
            auto p = json::parse(req.body).get<Patient>();
            if (m_repo->add_patient(p)) {
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
    m_svr.Put(R"(/api/patients/(\d+))", wrap_auth([this](const httplib::Request& req, httplib::Response& res) {
        try {
            int id = std::stoi(req.matches[1]);
            auto existing_opt = m_repo->get_patient(id);
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
            if (patch.contains("phone")) p.phone = patch["phone"].get<std::vector<std::string>>();

            if (m_repo->update_patient(p)) {
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
    m_svr.Post("/api/patients/import", wrap_auth([this](const httplib::Request& req, httplib::Response& res) {
        try {
            auto patients = json::parse(req.body).get<std::vector<Patient>>();
            m_repo->import_patients(patients);
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
    m_svr.Delete(R"(/api/patients/(\d+))", wrap_auth([this](const httplib::Request& req, httplib::Response& res) {
        int id = std::stoi(req.matches[1]);
        if (m_repo->delete_patient(id)) {
            res.set_content(json({{"status", "deleted"}}).dump(), "application/json");
        } else {
            res.status = 500;
        }
    }));

    // --- Endpoints de Avaliações ---

    m_svr.Post(R"(/api/patients/(\d+)/evaluations)", wrap_auth([this](const httplib::Request& req, httplib::Response& res) {
        try {
            int patient_id = std::stoi(req.matches[1]);
            auto e = json::parse(req.body).get<Evaluation>();
            e.patient_id = patient_id;
            if (m_repo->add_evaluation(e)) {
                res.status = 201;
                res.set_content(json({{"status", "ok"}}).dump(), "application/json");
            } else {
                res.status = 500;
            }
        } catch (...) {
            res.status = 400;
        }
    }));

    m_svr.Get(R"(/api/patients/(\d+)/evaluations)", wrap_auth([this](const httplib::Request& req, httplib::Response& res) {
        int patient_id = std::stoi(req.matches[1]);
        auto evals = m_repo->get_patient_evaluations(patient_id);
        res.set_content(json(evals).dump(), "application/json");
    }));

    m_svr.Put(R"(/api/patients/(\d+)/evaluations/(\d+))", wrap_auth([this](const httplib::Request& req, httplib::Response& res) {
        try {
            int patient_id = std::stoi(req.matches[1]);
            int eval_id = std::stoi(req.matches[2]);
            auto e = json::parse(req.body).get<Evaluation>();
            e.id = eval_id;
            e.patient_id = patient_id;
            if (m_repo->update_evaluation(e)) {
                res.status = 200;
                res.set_content(json({{"status", "ok"}}).dump(), "application/json");
            } else {
                res.status = 500;
            }
        } catch (...) {
            res.status = 400;
        }
    }));

    m_svr.Delete(R"(/api/patients/(\d+)/evaluations/(\d+))", wrap_auth([this](const httplib::Request& req, httplib::Response& res) {
        int eval_id = std::stoi(req.matches[2]);
        if (m_repo->delete_evaluation(eval_id)) {
            res.set_content(json({{"status", "deleted"}}).dump(), "application/json");
        } else {
            res.status = 500;
        }
    }));
}

} // namespace clinic
