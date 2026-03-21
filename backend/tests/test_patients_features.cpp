#include <gtest/gtest.h>
#include "../include/clinic/sqlite_database.hpp"
#include "../include/clinic/patient_repository.hpp"
#include <filesystem>
#include <memory>
#include <thread>
#include <chrono>

namespace clinic {

class PatientFeaturesTest : public ::testing::Test {
protected:
    void SetUp() override {
        db_path = "test_features.db";
        std::filesystem::remove(db_path);
        
        auto db = std::make_unique<SqliteDatabase>();
        repo = std::make_unique<PatientRepository>(std::move(db));
        ASSERT_TRUE(repo->initialize(db_path));
        ASSERT_TRUE(repo->authenticate("test_pass"));
    }

    void TearDown() override {
        repo.reset();
        std::filesystem::remove(db_path);
    }

    std::string db_path;
    std::unique_ptr<PatientRepository> repo;
};

TEST_F(PatientFeaturesTest, FavoriteStatusIsPersistent) {
    Patient p;
    p.name = "Favorite Patient";
    p.is_favorite = true;
    ASSERT_TRUE(repo->add_patient(p));
    
    auto all = repo->get_all_patients();
    ASSERT_EQ(all.size(), 1);
    EXPECT_TRUE(all[0].is_favorite);
    
    // Toggle favorite
    Patient retrieved = *repo->get_patient(*all[0].id);
    retrieved.is_favorite = false;
    ASSERT_TRUE(repo->update_patient(retrieved));
    
    auto updated = repo->get_patient(*retrieved.id);
    EXPECT_FALSE(updated->is_favorite);
}

TEST_F(PatientFeaturesTest, UpdatedAtIsSetOnCreation) {
    Patient p;
    p.name = "New Patient";
    ASSERT_TRUE(repo->add_patient(p));
    
    auto all = repo->get_all_patients();
    ASSERT_FALSE(all[0].updated_at.empty());
}

TEST_F(PatientFeaturesTest, UpdatedAtRefreshesOnPatientUpdate) {
    Patient p;
    p.name = "Update Test";
    repo->add_patient(p);
    
    auto p1 = repo->get_all_patients()[0];
    std::string initial_update = p1.updated_at;
    
    // Wait a bit to ensure timestamp changes (SQLite datetime('now') is in seconds)
    std::this_thread::sleep_for(std::chrono::seconds(1));
    
    p1.name = "Update Test Modified";
    ASSERT_TRUE(repo->update_patient(p1));
    
    auto p2 = repo->get_patient(*p1.id);
    EXPECT_NE(p2->updated_at, initial_update);
}

TEST_F(PatientFeaturesTest, UpdatedAtRefreshesOnNewEvaluation) {
    Patient p;
    p.name = "Eval Refresh Test";
    repo->add_patient(p);
    
    auto p1 = repo->get_all_patients()[0];
    std::string initial_update = p1.updated_at;
    
    std::this_thread::sleep_for(std::chrono::seconds(1));
    
    Evaluation e;
    e.patient_id = *p1.id;
    e.evaluation_date = "2024-03-20";
    e.medical_diagnosis = "Refresh Trigger";
    ASSERT_TRUE(repo->add_evaluation(e));
    
    auto p2 = repo->get_patient(*p1.id);
    EXPECT_NE(p2->updated_at, initial_update);
}

TEST_F(PatientFeaturesTest, UpdatedAtRefreshesOnEvaluationUpdate) {
    Patient p;
    p.name = "Eval Update Refresh";
    repo->add_patient(p);
    int pid = *repo->get_all_patients()[0].id;
    
    Evaluation e;
    e.patient_id = pid;
    e.evaluation_date = "2024-03-20";
    repo->add_evaluation(e);
    
    auto p1 = repo->get_patient(pid);
    std::string initial_update = p1->updated_at;
    
    std::this_thread::sleep_for(std::chrono::seconds(1));
    
    auto evals = repo->get_patient_evaluations(pid);
    auto e_to_update = evals[0];
    e_to_update.medical_diagnosis = "Changed";
    ASSERT_TRUE(repo->update_evaluation(e_to_update));
    
    auto p2 = repo->get_patient(pid);
    EXPECT_NE(p2->updated_at, initial_update);
}

TEST_F(PatientFeaturesTest, UpdatedAtRefreshesOnEvaluationDelete) {
    Patient p;
    p.name = "Eval Delete Refresh";
    repo->add_patient(p);
    int pid = *repo->get_all_patients()[0].id;
    
    Evaluation e;
    e.patient_id = pid;
    e.evaluation_date = "2024-03-20";
    repo->add_evaluation(e);
    
    auto p1 = repo->get_patient(pid);
    std::string initial_update = p1->updated_at;
    
    std::this_thread::sleep_for(std::chrono::seconds(1));
    
    auto evals = repo->get_patient_evaluations(pid);
    ASSERT_TRUE(repo->delete_evaluation(*evals[0].id));
    
    auto p2 = repo->get_patient(pid);
    EXPECT_NE(p2->updated_at, initial_update);
}

} // namespace clinic
