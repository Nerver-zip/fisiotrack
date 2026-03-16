#include <gtest/gtest.h>
#include "../include/clinic/mock_database.hpp"
#include "../include/clinic/patient_repository.hpp"
#include <memory>
#include <vector>

namespace clinic {

class ImportLogicTest : public ::testing::Test {
protected:
    void SetUp() override {
        auto mock_db = std::make_unique<MockDatabase>();
        repo = std::make_unique<PatientRepository>(std::move(mock_db));
    }

    std::unique_ptr<PatientRepository> repo;
};

TEST_F(ImportLogicTest, ImportMergesCorrectlyAndRespectsAllFields) {
    // 1. Prepara dados de importação
    std::vector<Patient> import_data;
    
    // Paciente 1 (primeira ocorrência)
    Patient p1;
    p1.name = "João da Silva";
    p1.healthcare_id = "SUS-999";
    p1.mom_name = "Maria da Silva";
    p1.birth_date = "1980-05-20";
    p1.cpf = "123.456.789-00";
    p1.gender = "Masculino";
    p1.address = "Rua Principal, 100";
    p1.profession = "Engenheiro";
    p1.phone = {"111"};
    Evaluation e1;
    e1.evaluation_date = "2024-01-10";
    e1.medical_diagnosis = "Cervicalgia";
    e1.treatment_plan = "Fisioterapia convencional";
    p1.evaluations.push_back(e1);
    import_data.push_back(p1);

    // Paciente 2 (ocorrência única)
    Patient p2;
    p2.name = "Maria Oliveira";
    p2.phone = {"222"};
    Evaluation e2;
    e2.evaluation_date = "2024-03-01";
    e2.medical_diagnosis = "Tendinite";
    p2.evaluations.push_back(e2);
    import_data.push_back(p2);
    
    // Paciente 1 (segunda ocorrência, para mesclagem)
    Patient p3;
    p3.name = "João da Silva";
    p3.phone = {"333", "111"}; // Telefone novo e um duplicado
    Evaluation e3;
    e3.evaluation_date = "2024-02-15";
    e3.medical_diagnosis = "Melhora progressiva";
    p3.evaluations.push_back(e3);
    import_data.push_back(p3);

    // 2. Executa a importação (a ser implementado no repositório)
    repo->import_patients(import_data);

    // 3. Verifica os resultados
    auto all_patients = repo->get_all_patients();
    ASSERT_EQ(all_patients.size(), 2);

    // Busca por "João da Silva" para verificar a mesclagem
    auto joao_list = repo->search_patients("João da Silva");
    ASSERT_EQ(joao_list.size(), 1);
    auto joao_full = repo->get_patient(*joao_list[0].id);

    // Verifica dados cadastrais (devem ser da primeira ocorrência)
    EXPECT_EQ(joao_full->healthcare_id, "SUS-999");
    EXPECT_EQ(joao_full->profession, "Engenheiro");

    // Verifica telefones (devem ser unificados)
    ASSERT_EQ(joao_full->phone.size(), 2);
    EXPECT_NE(std::find(joao_full->phone.begin(), joao_full->phone.end(), "111"), joao_full->phone.end());
    EXPECT_NE(std::find(joao_full->phone.begin(), joao_full->phone.end(), "333"), joao_full->phone.end());

    // Verifica avaliações (devem ser acumuladas)
    ASSERT_EQ(joao_full->evaluations.size(), 2);
    EXPECT_EQ(joao_full->evaluations[0].evaluation_date, "2024-02-15"); // Ordenado por data
    EXPECT_EQ(joao_full->evaluations[1].evaluation_date, "2024-01-10");
}

} // namespace clinic
