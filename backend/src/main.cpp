#include <iostream>
#include <fstream>
#include <memory>
#include <cstdlib>
#include <string>
#include <vector>
#include "../include/clinic/sqlite_database.hpp"
#include "../include/clinic/mock_database.hpp"
#include "../include/clinic/patient_repository.hpp"
#include "../include/clinic/api_server.hpp"

using namespace clinic;

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
    load_env("../../.env");

    const char* env_mode = std::getenv("DB_TYPE");
    std::string mode = env_mode ? env_mode : "mock";
    
    std::string db_path = "../../database/mock_patients.db";
    std::string db_pass = "clinica_master_2026";

    std::unique_ptr<IDatabase> db;
    if (mode == "mock") {
        std::cout << "🛠️ MODO: DESENVOLVIMENTO (Relacional)" << std::endl;
        db = std::make_unique<SqliteDatabase>();
    } else {
        db = std::make_unique<SqliteDatabase>();
        db_path = "../../database/patients.db";
        db_pass = ""; 
    }

    auto repo = std::make_shared<PatientRepository>(std::move(db));

    if (!repo->initialize(db_path)) {
        std::cerr << "Falha ao preparar repositório de dados." << std::endl;
        return 1;
    }

    ApiServer server(repo);
    server.listen("0.0.0.0", 8080);

    return 0;
}
