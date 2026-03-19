#include <gtest/gtest.h>
#include <filesystem>
#include "../include/clinic/sqlite_database.hpp"
#include "../include/clinic/patient_repository.hpp"

using namespace clinic;

class AuditLogTest : public ::testing::Test {
protected:
    void SetUp() override {
        db_path = "audit_test.db";
        std::filesystem::remove(db_path);
        
        auto db = std::make_unique<SqliteDatabase>();
        repo = std::make_shared<PatientRepository>(std::move(db));
        repo->initialize(db_path);
        repo->authenticate("test_pass");
    }

    void TearDown() override {
        repo->logout();
        std::filesystem::remove(db_path);
    }

    std::string db_path;
    std::shared_ptr<PatientRepository> repo;
};

TEST_F(AuditLogTest, RecordsPatientCreation) {
    Patient p;
    p.name = "Audit Test Patient";
    std::string session = "session_12345678";
    
    ASSERT_TRUE(repo->add_patient(p, session));
    
    auto logs = repo->get_audit_logs(10);
    ASSERT_FALSE(logs.empty());
    EXPECT_EQ(logs[0].action, "CREATE_PATIENT");
    EXPECT_EQ(logs[0].user_info, session);
    EXPECT_TRUE(logs[0].details.find("Audit Test Patient") != std::string::npos);
}

TEST_F(AuditLogTest, RecordsEvaluationUpdates) {
    Patient p;
    p.name = "Patient for Eval";
    repo->add_patient(p, "admin");
    
    Evaluation e;
    e.patient_id = 1;
    e.evaluation_date = "2024-03-18";
    e.medical_diagnosis = "Initial";
    repo->add_evaluation(e, "physio_1");
    
    auto logs = repo->get_audit_logs(1);
    ASSERT_EQ(logs[0].action, "CREATE_EVALUATION");
    EXPECT_EQ(logs[0].user_info, "physio_1");
}

TEST_F(AuditLogTest, RecordsDeletions) {
    Patient p;
    p.name = "To be deleted";
    repo->add_patient(p, "admin");
    
    ASSERT_TRUE(repo->delete_patient(1, "manager_user"));
    
    auto logs = repo->get_audit_logs(10);
    // O último log deve ser a deleção
    EXPECT_EQ(logs[0].action, "DELETE_PATIENT");
    EXPECT_EQ(logs[0].entity_id, 1);
    EXPECT_EQ(logs[0].user_info, "manager_user");
}

TEST_F(AuditLogTest, RespectsLimit) {
    for (int i = 0; i < 10; ++i) {
        Patient p;
        p.name = "Patient " + std::to_string(i);
        repo->add_patient(p, "system");
    }
    
    auto logs = repo->get_audit_logs(5);
    EXPECT_EQ(logs.size(), 5);
}
