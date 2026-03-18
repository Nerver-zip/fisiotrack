#include <iostream>
#include <fstream>
#include <memory>
#include <cstdlib>
#include <string>
#include <vector>
#include <filesystem>
#include "../include/clinic/sqlite_database.hpp"
#include "../include/clinic/mock_database.hpp"
#include "../include/clinic/patient_repository.hpp"
#include "../include/clinic/api_server.hpp"

using namespace clinic;

/**
 * @brief Carrega variáveis de ambiente a partir de um arquivo .env.
 */
void load_env(const std::string& path) {
    std::ifstream file(path);
    if (!file.is_open()) return;
    std::string line;
    while (std::getline(file, line)) {
        if (line.empty() || line[0] == '#') continue;
        size_t sep = line.find('=');
        if (sep != std::string::npos) {
            std::string key = line.substr(0, sep);
            std::string val = line.substr(sep + 1);
            // Remove possíveis espaços extras ou \r
            if (!val.empty() && val.back() == '\r') val.pop_back();
            setenv(key.c_str(), val.c_str(), 1);
        }
    }
}

int main() {
    load_env("../../.env");

    const char* env_mode = std::getenv("DB_TYPE");
    std::string mode = env_mode ? env_mode : "real"; 

    std::string db_path;
    std::string db_pass = "";

    if (mode == "mock") {
        std::cout << "🛠️  MODO: DESENVOLVIMENTO (Persistente)" << std::endl;
        const char* m_path = std::getenv("DB_MOCK_PATH");
        const char* m_pass = std::getenv("DB_MOCK_PASSWORD");
        db_path = m_path ? m_path : "database/mock_patients.db";
        db_pass = m_pass ? m_pass : "";
    } else {
        std::cout << "🔒 MODO: PRODUÇÃO (Zero-Knowledge)" << std::endl;
        const char* r_path = std::getenv("DB_REAL_PATH");
        db_path = r_path ? r_path : "database/patients.db";
        // Em modo REAL, ignoramos qualquer senha no .env para forçar ZKP puro.
        db_pass = ""; 
    }

    std::unique_ptr<IDatabase> db = std::make_unique<SqliteDatabase>();
    auto repo = std::make_shared<PatientRepository>(std::move(db));

    // Garante que o diretório do banco existe
    std::filesystem::path p(db_path);
    if (!p.parent_path().empty()) {
        std::filesystem::create_directories(p.parent_path());
    }

    if (!repo->initialize(db_path)) {
        std::cerr << "Falha ao preparar repositório de dados em: " << db_path << std::endl;
        return 1;
    }

    // Inicialização automática do arquivo de banco no modo MOCK (para agilidade)
    if (mode == "mock" && !repo->is_initialized() && !db_pass.empty()) {
        std::cout << "✨ Inicializando banco de teste automaticamente..." << std::endl;
        if (repo->authenticate(db_pass)) {
            repo->logout(); 
            std::cout << "✅ Banco de teste pronto em: " << db_path << std::endl;
        }
    }

    const char* env_port = std::getenv("API_PORT");
    int port = env_port ? std::stoi(env_port) : 8080;

    const char* env_host = std::getenv("API_HOST");
    std::string host = env_host ? env_host : "0.0.0.0";

    ApiServer server(repo);
    server.listen(host, port);

    return 0;
}
