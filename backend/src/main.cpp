#include <iostream>
#include <memory>
#include <vector>
#include "../include/clinic/sqlite_database.hpp"
#include "../include/clinic/patient_repository.hpp"

using namespace clinic;

void seed_database(const std::string& db_path, const std::string& password) {
    auto db = std::make_unique<SqliteDatabase>();
    PatientRepository repo(std::move(db));

    std::cout << "Gerando banco de dados mockado: " << db_path << "..." << std::endl;

    if (!repo.initialize(db_path, password)) {
        std::cerr << "Erro ao inicializar o banco!" << std::endl;
        return;
    }

    // Lista de pacientes mockados para a PoC
    std::vector<Patient> mock_patients = {
        {std::nullopt, "Joaquim Ferreira", 65, "123.456.789-10", "1959-05-12", "2026-03-11", "Masculino", "Rua das Flores, 123", "Aposentado", "11999887766", "Dr. Arnaldo", "Artrite Reumatoide", "Dor crônica nos joelhos", "Início há 5 anos, piora no inverno.", "Nenhuma", "Metotrexato", "Caminhada leve", "Crepitação em ambos os joelhos", "Fisioterapia analgésica e fortalecimento"},
        {std::nullopt, "Ana Paula Souza", 28, "987.654.321-00", "1998-10-20", "2026-03-11", "Feminino", "Av. Paulista, 1500", "Designer", "11977665544", "Dra. Juliana", "Tendinite de Quervain", "Dor no punho direito", "Relacionada ao uso excessivo de mouse.", "Gastrite", "Anti-inflamatórios", "Crossfit (suspenso)", "Teste de Finkelstein positivo", "Ultrassom, gelo e reeducação ergonômica"},
        {std::nullopt, "Marcos Oliveira", 42, "111.222.333-44", "1984-02-28", "2026-03-10", "Masculino", "Rua Chile, 45", "Motorista", "11966554433", "Dr. Paulo", "Hérnia de Disco L4-L5", "Lombalgia com irradiação", "Dor que desce para a perna esquerda.", "Nenhuma", "Pregabalina", "Sedentário", "Lasègue positivo a 45 graus", "Descompressão manual e exercícios de core"}
    };

    for (const auto& p : mock_patients) {
        if (repo.add_patient(p)) {
            std::cout << "Paciente adicionado: " << p.name << std::endl;
        }
    }

    std::cout << "\n✅ Banco de dados '" << db_path << "' gerado com sucesso!" << std::endl;
    std::cout << "🔑 Senha utilizada: " << password << std::endl;
}

int main() {
    // Para a PoC/Desenvolvimento, geramos o banco mockado na pasta database/
    // O caminho "../../database/" assume que o executável está em backend/build/
    seed_database("../../database/mock_patients.db", "clinica_master_2026");
    return 0;
}
