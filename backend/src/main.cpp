#include <iostream>
#include <fstream>
#include <memory>
#include <cstdlib>
#include <string>
#include <vector>
#include "../include/clinic/sqlite_database.hpp"
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
            std::string key = line.substr(0, sep);
            std::string val = line.substr(sep + 1);
            setenv(key.c_str(), val.c_str(), 1);
        }
    }
}

void seed_if_needed(PatientRepository& repo) {
    auto all = repo.get_all_patients();
    if (!all.empty()) return;

    std::cout << "Semeando banco de dados inicial com novos campos..." << std::endl;
    std::vector<Patient> mock_patients = {
        {std::nullopt, "0004100020040013423002", "Joaquim Ferreira", "Maria Ferreira", 65, "123.456.789-10", "1959-05-12", "2026-03-11", "Masculino", "Rua das Flores, 123", "Aposentado", "11999887766", "Dr. Arnaldo", "Artrite Reumatoide", "Dor crônica nos joelhos", "Início há 5 anos, piora no inverno.", "Nenhuma", "Metotrexato", "Caminhada leve", "Crepitação em ambos os joelhos", "Fisioterapia analgésica e fortalecimento"},
        {std::nullopt, "0004100020040013423003", "Ana Paula Souza", "Lucia Souza", 28, "987.654.321-00", "1998-10-20", "2026-03-11", "Feminino", "Av. Paulista, 1500", "Designer", "11977665544", "Dra. Juliana", "Tendinite de Quervain", "Dor no punho direito", "Relacionada ao uso excessivo de mouse.", "Gastrite", "Anti-inflamatórios", "Crossfit (suspenso)", "Teste de Finkelstein positivo", "Ultrassom, gelo e reeducação ergonômica"}
    };

    for (const auto& p : mock_patients) {
        repo.add_patient(p);
    }
}

int main() {
    load_env("../../.env");

    const char* env_mode = std::getenv("DB_TYPE");
    std::string mode = env_mode ? env_mode : "mock";
    
    std::string db_path;
    std::string db_pass;

    if (mode == "mock") {
        std::cout << "🛠️ MODO DESENVOLVIMENTO (Mock DB em disco)" << std::endl;
        db_path = "../../database/mock_patients.db";
        const char* env_pass = std::getenv("DB_PASSWORD");
        db_pass = env_pass ? env_pass : "clinica_master_2026";
    } else {
        std::cout << "🚀 MODO PRODUÇÃO (Banco Real)" << std::endl;
        db_path = "../../database/patients.db";
        db_pass = ""; 
    }

    auto db = std::make_unique<SqliteDatabase>();
    auto repo = std::make_shared<PatientRepository>(std::move(db));

    if (!db_pass.empty()) {
        if (!repo->initialize(db_path, db_pass)) {
            std::cerr << "Falha ao inicializar banco de dados em: " << db_path << std::endl;
            return 1;
        }
        if (mode == "mock") seed_if_needed(*repo);
    }

    const char* env_host = std::getenv("API_HOST");
    std::string host = env_host ? env_host : "0.0.0.0";
    const char* env_port = std::getenv("API_PORT");
    int port = env_port ? std::stoi(env_port) : 8080;

    ApiServer server(repo);
    server.listen(host, port);

    return 0;
}
