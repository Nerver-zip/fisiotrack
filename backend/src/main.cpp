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
    
    // Paciente 1
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
    
    Evaluation e1;
    e1.evaluation_date = "2026-03-11";
    e1.age = 65;
    e1.doctor = "Dr. Arnaldo";
    e1.medical_diagnosis = "Artrite Reumatoide";
    e1.chief_complaint = "Dor crônica nos joelhos";
    e1.history_present_illness = "Início há 5 anos.";
    e1.past_medical_history = "Nenhuma";
    e1.medications = "Metotrexato";
    e1.habits_activities = "Caminhada leve";
    e1.physical_exam = "Crepitação";
    e1.treatment_plan = "Fortalecimento";
    p1.evaluations.push_back(e1);
    repo.add_patient(p1);

    // Paciente 2
    Patient p2;
    p2.healthcare_id = "0004100020040013423003";
    p2.name = "Ana Paula Souza";
    p2.mom_name = "Lucia Souza";
    p2.birth_date = "1985-08-20";
    p2.cpf = "987.654.321-00";
    p2.gender = "Feminino";
    p2.address = "Av. Paulista, 1500";
    p2.profession = "Advogada";
    p1.phone = {"11988776655"};

    Evaluation e2;
    e2.evaluation_date = "2026-03-15";
    e2.age = 40;
    e2.doctor = "Dra. Beatriz";
    e2.medical_diagnosis = "Hérnia de Disco Lombar";
    e2.chief_complaint = "Dor irradiada para perna direita";
    e2.history_present_illness = "Piora após carregar peso.";
    e2.past_medical_history = "Sedentarismo";
    e2.medications = "Pregabalina";
    e2.habits_activities = "Trabalho sentado";
    e2.physical_exam = "Lasègue positivo";
    e2.treatment_plan = "RPG e Pilates";
    p2.evaluations.push_back(e2);
    repo.add_patient(p2);

    // Paciente 3
    Patient p3;
    p3.healthcare_id = "44123";
    p3.name = "Joaquim Oliveira";
    p3.mom_name = "Fernanda Oliveira";
    p3.birth_date = "1978-03-10";
    p3.cpf = "408.358.200-68";
    p3.gender = "Masculino";
    p3.address = "Rua do Bosque, 45";
    p3.profession = "Vendedor";
    p3.phone = {"11977665544"};

    Evaluation e3;
    e3.evaluation_date = "2026-02-10";
    e3.age = 47;
    e3.doctor = "Dr. Carlos";
    e3.medical_diagnosis = "Tendinite de Ombro";
    e3.chief_complaint = "Dor ao elevar o braço";
    e3.history_present_illness = "Início após esforço repetitivo.";
    e3.past_medical_history = "Nenhuma";
    e3.medications = "Ibuprofeno";
    e3.habits_activities = "Academia";
    e3.physical_exam = "Teste de Neer positivo";
    e3.treatment_plan = "Ultrassom e exercícios de mobilidade";
    p3.evaluations.push_back(e3);
    repo.add_patient(p3);
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
