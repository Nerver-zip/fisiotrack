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
            setenv(line.substr(0, sep).c_str(), line.substr(sep + 1).c_str(), 1);
        }
    }
}

int main() {
    // Tenta carregar o .env da raiz do projeto
    load_env(".env");
    load_env("../../.env");

    const char* env_mode = std::getenv("DB_TYPE");
    std::string mode = env_mode ? env_mode : "real"; 

    // Configurações do Banco vindas do .env
    const char* env_path = std::getenv("DB_PATH");
    std::string db_path = env_path ? env_path : "database/patients.db";
    
    const char* env_pass = std::getenv("DB_PASSWORD");
    std::string db_pass = (env_pass && mode == "mock") ? env_pass : "";

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

    if (mode == "mock") {
        std::cout << "🛠️  MODO: DESENVOLVIMENTO (Persistente)" << std::endl;
        // No modo mock, se o banco não existir e tivermos uma senha no .env, 
        // inicializamos ele automaticamente para facilitar o desenvolvimento.
        if (!repo->is_initialized() && !db_pass.empty()) {
            std::cout << "✨ Inicializando banco de teste com senha do .env..." << std::endl;
            if (repo->authenticate(db_pass)) {
                repo->logout(); // Fecha para que o fluxo de login normal (via App) funcione
                std::cout << "✅ Banco de teste pronto. Use a senha do .env no login." << std::endl;
            }
        }
    } else {
        std::cout << "🔒 MODO: PRODUÇÃO (Zero-Knowledge)" << std::endl;
        // Em produção, db_pass é sempre vazio aqui. O banco só abre via API (Login/Setup).
    }

    const char* env_port = std::getenv("API_PORT");
    int port = env_port ? std::stoi(env_port) : 8080;

    const char* env_host = std::getenv("API_HOST");
    std::string host = env_host ? env_host : "0.0.0.0";

    ApiServer server(repo);
    server.listen(host, port);

    return 0;
}
