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
        repo->initialize("mock.db");
        repo->authenticate("pass");
    }

    std::unique_ptr<PatientRepository> repo;
};

TEST_F(ImportLogicTest, ImportMergesCorrectlyAndRespectsAllFields) {
    std::vector<Patient> import_data;
    
    Patient p1;
    p1.name = "João da Silva";
    p1.phone = {"111"};
    Evaluation e1;
    e1.evaluation_date = "2024-01-10";
    e1.medical_diagnosis = "Cervicalgia";
    p1.evaluations.push_back(e1);
    import_data.push_back(p1);

    Patient p2;
    p2.name = "Maria Oliveira";
    p2.phone = {"222"};
    import_data.push_back(p2);
    
    Patient p3;
    p3.name = "João da Silva";
    p3.phone = {"333", "111"}; 
    Evaluation e3;
    e3.evaluation_date = "2024-02-15";
    e3.medical_diagnosis = "Melhora progressiva";
    p3.evaluations.push_back(e3);
    import_data.push_back(p3);

    repo->import_patients(import_data);

    auto all_patients = repo->get_all_patients();
    ASSERT_EQ(all_patients.size(), 2);

    auto joao_list = repo->search_patients("João da Silva");
    ASSERT_EQ(joao_list.size(), 1);
    auto joao_full = repo->get_patient(*joao_list[0].id);

    ASSERT_EQ(joao_full->phone.size(), 2);
    ASSERT_EQ(joao_full->evaluations.size(), 2);
}

} // namespace clinic
