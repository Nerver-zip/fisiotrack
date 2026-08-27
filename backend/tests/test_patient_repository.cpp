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

TEST_F(PatientRepositoryTest, CanGetAllPatientsFull) {
    Patient p1; p1.name = "P1"; repo->add_patient(p1);
    Patient p2; p2.name = "P2"; repo->add_patient(p2);

    auto all_simple = repo->get_all_patients();
    ASSERT_EQ(all_simple.size(), 2);
    // get_all_patients no mock não busca avaliações por padrão (depende da implementação do mock)

    Evaluation e;
    e.patient_id = *all_simple[0].id;
    e.evaluation_date = "2024-03-24";
    repo->add_evaluation(e);

    auto all_full = repo->get_all_patients_full();
    ASSERT_EQ(all_full.size(), 2);

    bool found_eval = false;
    for (const auto& p : all_full) {
        if (p.id == all_simple[0].id) {
            EXPECT_EQ(p.evaluations.size(), 1);
            EXPECT_EQ(p.evaluations[0].evaluation_date, "2024-03-24");
            found_eval = true;
        }
    }
    EXPECT_TRUE(found_eval);
}

} // namespace clinic
