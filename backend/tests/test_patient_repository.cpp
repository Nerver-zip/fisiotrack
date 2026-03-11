#include <gtest/gtest.h>
#include "../include/clinic/mock_database.hpp"
#include "../include/clinic/patient_repository.hpp"
#include <memory>

namespace clinic {

class PatientRepositoryTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Usamos o MockDatabase para isolar os testes do repositório
        auto mock_db = std::make_unique<MockDatabase>();
        repo = std::make_unique<PatientRepository>(std::move(mock_db));
    }

    Patient create_minimal_patient(const std::string& name) {
        return Patient{
            std::nullopt, name, 0, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
        };
    }

    std::unique_ptr<PatientRepository> repo;
};

TEST_F(PatientRepositoryTest, CanAddAndGetPatient) {
    Patient p = create_minimal_patient("Test Patient");
    ASSERT_TRUE(repo->add_patient(p));
    
    auto all = repo->get_all_patients();
    ASSERT_EQ(all.size(), 1);
    EXPECT_EQ(all[0].name, "Test Patient");
    ASSERT_TRUE(all[0].id.has_value());
    
    auto retrieved = repo->get_patient(*all[0].id);
    ASSERT_TRUE(retrieved.has_value());
    EXPECT_EQ(retrieved->name, "Test Patient");
}

TEST_F(PatientRepositoryTest, CanSearchPatients) {
    repo->add_patient(create_minimal_patient("Alice Wonder"));
    repo->add_patient(create_minimal_patient("Bob Builder"));
    
    auto results = repo->search_patients("alice");
    ASSERT_EQ(results.size(), 1);
    EXPECT_EQ(results[0].name, "Alice Wonder");
}

TEST_F(PatientRepositoryTest, CanUpdatePatient) {
    repo->add_patient(create_minimal_patient("Original"));
    auto p = repo->get_all_patients()[0];
    
    p.name = "Updated";
    ASSERT_TRUE(repo->update_patient(p));
    
    auto updated = repo->get_patient(*p.id);
    ASSERT_TRUE(updated.has_value());
    EXPECT_EQ(updated->name, "Updated");
}

TEST_F(PatientRepositoryTest, CanDeletePatient) {
    repo->add_patient(create_minimal_patient("Delete Me"));
    auto p = repo->get_all_patients()[0];
    
    ASSERT_TRUE(repo->delete_patient(*p.id));
    EXPECT_FALSE(repo->get_patient(*p.id).has_value());
    EXPECT_TRUE(repo->get_all_patients().empty());
}

} // namespace clinic
