#include <gtest/gtest.h>
#include "../include/clinic/mock_database.hpp"
#include "../include/clinic/patient_repository.hpp"
#include <memory>

namespace clinic {

class PatientRepositoryTest : public ::testing::Test {
protected:
    void SetUp() override {
        auto db = std::make_unique<MockDatabase>();
        repo = std::make_unique<PatientRepository>(std::move(db));
        repo->initialize("mock.db");
        repo->authenticate("pass");
    }

    std::unique_ptr<PatientRepository> repo;
};

TEST_F(PatientRepositoryTest, CanAddAndGetPatient) {
    Patient p;
    p.name = "Test Repository";
    ASSERT_TRUE(repo->add_patient(p));
    
    auto all = repo->get_all_patients();
    ASSERT_EQ(all.size(), 1);
    EXPECT_EQ(all[0].name, "Test Repository");
}

TEST_F(PatientRepositoryTest, CanSearchPatients) {
    Patient p1; p1.name = "Alice"; repo->add_patient(p1);
    Patient p2; p2.name = "Bob";   repo->add_patient(p2);
    
    auto results = repo->search_patients("ali");
    ASSERT_EQ(results.size(), 1);
    EXPECT_EQ(results[0].name, "Alice");
}

TEST_F(PatientRepositoryTest, CanUpdatePatient) {
    Patient p; p.name = "Old Name";
    repo->add_patient(p);
    auto all = repo->get_all_patients();
    p = all[0];
    
    p.name = "New Name";
    ASSERT_TRUE(repo->update_patient(p));
    EXPECT_EQ(repo->get_patient(*p.id)->name, "New Name");
}

TEST_F(PatientRepositoryTest, CanDeletePatient) {
    repo->add_patient(Patient{});
    auto p = repo->get_all_patients()[0];
    
    ASSERT_TRUE(repo->delete_patient(*p.id));
    EXPECT_FALSE(repo->get_patient(*p.id).has_value());
    EXPECT_TRUE(repo->get_all_patients().empty());
}

} // namespace clinic
