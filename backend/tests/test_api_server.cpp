#include <gtest/gtest.h>
#include <httplib.h>
#include <nlohmann/json.hpp>
#include <thread>
#include <chrono>
#include "../include/clinic/api_server.hpp"
#include "../include/clinic/mock_database.hpp"

namespace clinic {

using json = nlohmann::json;

class ApiServerTest : public ::testing::Test {
protected:
    void SetUp() override {
        auto mock_db = std::make_unique<MockDatabase>();
        repo = std::make_shared<PatientRepository>(std::move(mock_db));
        
        Patient p;
        p.healthcare_id = "SUS-123";
        p.name = "Initial Patient";
        p.phone = {"111"};
        repo->add_patient(p);

        Evaluation e;
        e.patient_id = 1;
        e.evaluation_date = "2024-03-10";
        e.medical_diagnosis = "Initial Diagnosis";
        repo->add_evaluation(e);
        
        server = std::make_unique<ApiServer>(repo);
        
        server_thread = std::thread([this]() {
            server->listen("127.0.0.1", 8083);
        });
        
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }

    void TearDown() override {
        server->stop();
        if (server_thread.joinable()) {
            server_thread.join();
        }
    }

    std::shared_ptr<PatientRepository> repo;
    std::unique_ptr<ApiServer> server;
    std::thread server_thread;
};

TEST_F(ApiServerTest, CanUpdateEvaluationViaPut) {
    httplib::Client cli("http://127.0.0.1:8083");
    json update_e = {
        {"medical_diagnosis", "Updated Diagnosis"},
        {"treatment_plan", "New Plan"}
    };
    
    // PUT /api/patients/1/evaluations/1
    auto res = cli.Put("/api/patients/1/evaluations/1", update_e.dump(), "application/json");
    ASSERT_EQ(res->status, 200);
    
    auto evals = repo->get_patient_evaluations(1);
    ASSERT_FALSE(evals.empty());
    EXPECT_EQ(evals[0].medical_diagnosis, "Updated Diagnosis");
    EXPECT_EQ(evals[0].treatment_plan, "New Plan");
}

TEST_F(ApiServerTest, PutEvaluationReturns500ForNonExistentEval) {
    httplib::Client cli("http://127.0.0.1:8083");
    json update_e = {{"medical_diagnosis", "Doesn't matter"}};
    auto res = cli.Put("/api/patients/1/evaluations/999", update_e.dump(), "application/json");
    EXPECT_EQ(res->status, 500); 
}

TEST_F(ApiServerTest, CanDeleteEvaluation) {
    httplib::Client cli("http://127.0.0.1:8083");
    auto res = cli.Delete("/api/patients/1/evaluations/1");
    ASSERT_EQ(res->status, 200);
    
    auto evals = repo->get_patient_evaluations(1);
    EXPECT_TRUE(evals.empty());
}

TEST_F(ApiServerTest, CanListPatients) {
    httplib::Client cli("http://127.0.0.1:8083");
    auto res = cli.Get("/api/patients");
    ASSERT_EQ(res->status, 200);
    auto j = json::parse(res->body);
    EXPECT_EQ(j.size(), 1);
}

TEST_F(ApiServerTest, CanUpdatePatientViaPut) {
    httplib::Client cli("http://127.0.0.1:8083");
    json update_p = {
        {"name", "Updated Name"},
        {"phone", {"999", "888"}}
    };
    auto res = cli.Put("/api/patients/1", update_p.dump(), "application/json");
    ASSERT_EQ(res->status, 200);
    auto updated = repo->get_patient(1);
    EXPECT_EQ(updated->name, "Updated Name");
}

TEST_F(ApiServerTest, PutReturns404ForNonExistentPatient) {
    httplib::Client cli("http://127.0.0.1:8083");
    json update_p = {{"name", "Nobody"}};
    auto res = cli.Put("/api/patients/999", update_p.dump(), "application/json");
    EXPECT_EQ(res->status, 404); 
}

TEST_F(ApiServerTest, CanUpdateOnlyOneField) {
    httplib::Client cli("http://127.0.0.1:8083");
    json update_p = {{"address", "New Address"}};
    cli.Put("/api/patients/1", update_p.dump(), "application/json");
    auto updated = repo->get_patient(1);
    EXPECT_EQ(updated->address, "New Address");
    EXPECT_EQ(updated->name, "Initial Patient");
}

TEST_F(ApiServerTest, CanDeletePatient) {
    httplib::Client cli("http://127.0.0.1:8083");
    auto res = cli.Delete("/api/patients/1");
    ASSERT_EQ(res->status, 200);
    auto res_list = cli.Get("/api/patients");
    auto j = json::parse(res_list->body);
    EXPECT_EQ(j.size(), 0);
}

} // namespace clinic
