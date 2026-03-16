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

void seed_if_needed(PatientRepository& repo) {
    if (!repo.get_all_patients().empty()) return;

    std::cout << "Semeando banco de dados relacional..." << std::endl;
    
    Patient p1;
    p1.healthcare_id = "0004100020040013423002";
    p1.name = "Joaquim Ferreira";
    p1.mom_name = "Maria Ferreira";
    p1.birth_date = "1959-05-12";
    p1.cpf = "123.456.789-10";
    p1.gender = "Masculino";
    p1.address = "Rua das Flores, 123";
    p1.profession = "Aposentado";
    p1.phone = {"11999887766"};
    repo.add_patient(p1);
    
    // Recupera o ID gerado para vincular a avaliação
    auto patients = repo.get_all_patients();
    if (patients.empty()) return;
    int p1_id = *patients[0].id;

    Evaluation e1{std::nullopt, p1_id, "2026-03-11", 65, "Dr. Arnaldo", "Artrite Reumatoide", "Dor crônica nos joelhos", "Início há 5 anos.", "Nenhuma", "Metotrexato", "Caminhada leve", "Crepitação", "Fortalecimento"};
    repo.add_evaluation(e1);
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

    if (!db_pass.empty()) {
        if (!repo->initialize(db_path, db_pass)) {
            std::cerr << "Falha ao inicializar banco." << std::endl;
            return 1;
        }
        if (mode == "mock") seed_if_needed(*repo);
    }

    ApiServer server(repo);
    server.listen("0.0.0.0", 8080);

    return 0;
}
