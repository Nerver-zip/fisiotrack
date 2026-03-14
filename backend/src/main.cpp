#include <iostream>
#include <memory>
#include "../include/clinic/sqlite_database.hpp"
#include "../include/clinic/patient_repository.hpp"
#include "../include/clinic/api_server.hpp"

using namespace clinic;

void seed_if_needed(PatientRepository& repo) {
    if (!repo.get_all_patients().empty()) return;

    std::cout << "Semeando banco de dados inicial..." << std::endl;
    std::vector<Patient> mock_patients = {
        {std::nullopt, "Joaquim Ferreira", 65, "123.456.789-10", "1959-05-12", "2026-03-11", "Masculino", "Rua das Flores, 123", "Aposentado", "11999887766", "Dr. Arnaldo", "Artrite Reumatoide", "Dor crônica nos joelhos", "Início há 5 anos, piora no inverno.", "Nenhuma", "Metotrexato", "Caminhada leve", "Crepitação em ambos os joelhos", "Fisioterapia analgésica e fortalecimento"},
        {std::nullopt, "Ana Paula Souza", 28, "987.654.321-00", "1998-10-20", "2026-03-11", "Feminino", "Av. Paulista, 1500", "Designer", "11977665544", "Dra. Juliana", "Tendinite de Quervain", "Dor no punho direito", "Relacionada ao uso excessivo de mouse.", "Gastrite", "Anti-inflamatórios", "Crossfit (suspenso)", "Teste de Finkelstein positivo", "Ultrassom, gelo e reeducação ergonômica"},
        {std::nullopt, "Marcos Oliveira", 42, "111.222.333-44", "1984-02-28", "2026-03-10", "Masculino", "Rua Chile, 45", "Motorista", "11966554433", "Dr. Paulo", "Hérnia de Disco L4-L5", "Lombalgia com irradiação", "Dor que desce para a perna esquerda.", "Nenhuma", "Pregabalina", "Sedentário", "Lasègue positivo a 45 graus", "Descompressão manual e exercícios de core"}
    };

    for (const auto& p : mock_patients) repo.add_patient(p);
}

int main() {
    // 1. Inicializa o Banco de Dados
    auto db = std::make_unique<SqliteDatabase>();
    auto repo = std::make_shared<PatientRepository>(std::move(db));

    if (!repo->initialize("../../database/mock_patients.db", "clinica_master_2026")) {
        std::cerr << "Falha ao inicializar banco de dados." << std::endl;
        return 1;
    }

    // 2. Preenche com dados iniciais se necessário
    seed_if_needed(*repo);

    // 3. Inicia o Servidor de API
    ApiServer server(repo);
    server.listen("0.0.0.0", 8080);

    return 0;
}
