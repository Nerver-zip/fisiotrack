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
        repo->initialize("mock.db");
        // O MockDatabase sempre aceita qualquer senha e abre
        repo->authenticate("any_password");

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
            server->listen("127.0.0.1", 8084);
        });
        
        std::this_thread::sleep_for(std::chrono::milliseconds(500));

        // Realiza Login para obter o token para os outros testes
        httplib::Client cli("http://127.0.0.1:8084");
        auto res = cli.Post("/api/login", json({{"password", "any" }}).dump(), "application/json");
        auto j = json::parse(res->body);
        m_token = j["token"];
    }

    void TearDown() override {
        server->stop();
        if (server_thread.joinable()) {
            server_thread.join();
        }
    }

    httplib::Headers auth_headers() {
        return {{"Authorization", "Bearer " + m_token}};
    }

    std::shared_ptr<PatientRepository> repo;
    std::unique_ptr<ApiServer> server;
    std::thread server_thread;
    std::string m_token;
};

TEST_F(ApiServerTest, LoginReturnsToken) {
    httplib::Client cli("http://127.0.0.1:8084");
    auto res = cli.Post("/api/login", json({{"password", "any" }}).dump(), "application/json");
    ASSERT_EQ(res->status, 200);
    auto j = json::parse(res->body);
    EXPECT_FALSE(j["token"].get<std::string>().empty());
}

TEST_F(ApiServerTest, ProtectedRouteReturns401WithoutToken) {
    httplib::Client cli("http://127.0.0.1:8084");
    auto res = cli.Get("/api/patients");
    EXPECT_EQ(res->status, 401);
}

TEST_F(ApiServerTest, CanListPatientsWithToken) {
    httplib::Client cli("http://127.0.0.1:8084");
    auto res = cli.Get("/api/patients", auth_headers());
    ASSERT_EQ(res->status, 200);
}

TEST_F(ApiServerTest, CanUpdatePatientViaPut) {
    httplib::Client cli("http://127.0.0.1:8084");
    json update_p = {{"name", "Updated Name"}};
    auto res = cli.Put("/api/patients/1", auth_headers(), update_p.dump(), "application/json");
    ASSERT_EQ(res->status, 200);
}

TEST_F(ApiServerTest, CanUpdateEvaluationViaPut) {
    httplib::Client cli("http://127.0.0.1:8084");
    json update_e = {{"medical_diagnosis", "Updated Diagnosis"}};
    auto res = cli.Put("/api/patients/1/evaluations/1", auth_headers(), update_e.dump(), "application/json");
    ASSERT_EQ(res->status, 200);
}

TEST_F(ApiServerTest, CanDeleteEvaluation) {
    httplib::Client cli("http://127.0.0.1:8084");
    auto res = cli.Delete("/api/patients/1/evaluations/1", auth_headers());
    ASSERT_EQ(res->status, 200);
}

TEST_F(ApiServerTest, LogoutInvalidatesToken) {
    httplib::Client cli("http://127.0.0.1:8084");
    cli.Post("/api/logout", auth_headers(), "", "");
    
    auto res = cli.Get("/api/patients", auth_headers());
    EXPECT_EQ(res->status, 401);
}

} // namespace clinic
