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
        
        server = std::make_unique<ApiServer>(repo);
        
        server_thread = std::thread([this]() {
            server->listen("127.0.0.1", 8082);
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

TEST_F(ApiServerTest, CanListPatients) {
    httplib::Client cli("http://127.0.0.1:8082");
    auto res = cli.Get("/api/patients");
    ASSERT_EQ(res->status, 200);
    auto j = json::parse(res->body);
    EXPECT_EQ(j.size(), 1);
}

TEST_F(ApiServerTest, CanUpdatePatientViaPut) {
    httplib::Client cli("http://127.0.0.1:8082");
    json update_p = {
        {"name", "Updated Name"},
        {"phone", {"999", "888"}}
    };
    
    auto res = cli.Put("/api/patients/1", update_p.dump(), "application/json");
    ASSERT_EQ(res->status, 200);
    
    auto updated = repo->get_patient(1);
    ASSERT_TRUE(updated.has_value());
    EXPECT_EQ(updated->name, "Updated Name");
    EXPECT_EQ(updated->phone.size(), 2);
}

TEST_F(ApiServerTest, PutReturns404ForNonExistentPatient) {
    httplib::Client cli("http://127.0.0.1:8082");
    json update_p = {{"name", "Nobody"}};
    auto res = cli.Put("/api/patients/999", update_p.dump(), "application/json");
    EXPECT_EQ(res->status, 404); 
}

TEST_F(ApiServerTest, PutHandlesMalformedJson) {
    httplib::Client cli("http://127.0.0.1:8082");
    auto res = cli.Put("/api/patients/1", "{ invalid json", "application/json");
    EXPECT_EQ(res->status, 400);
}

TEST_F(ApiServerTest, CanUpdateOnlyOneField) {
    httplib::Client cli("http://127.0.0.1:8082");
    json update_p = {{"address", "New Address"}};
    cli.Put("/api/patients/1", update_p.dump(), "application/json");
    
    auto updated = repo->get_patient(1);
    EXPECT_EQ(updated->address, "New Address");
    EXPECT_EQ(updated->name, "Initial Patient"); // Mantém os outros
}

TEST_F(ApiServerTest, UpdateReplacesPhoneList) {
    httplib::Client cli("http://127.0.0.1:8082");
    json update_p = {{"phone", {"555"}}};
    cli.Put("/api/patients/1", update_p.dump(), "application/json");
    
    auto updated = repo->get_patient(1);
    ASSERT_EQ(updated->phone.size(), 1);
    EXPECT_EQ(updated->phone[0], "555");
}

TEST_F(ApiServerTest, PutEndpointSyncsWithGetDetails) {
    httplib::Client cli("http://127.0.0.1:8082");
    cli.Put("/api/patients/1", json({{"name", "Sync Test"}}).dump(), "application/json");
    
    auto res = cli.Get("/api/patients/1");
    auto j = json::parse(res->body);
    EXPECT_EQ(j["name"], "Sync Test");
}

TEST_F(ApiServerTest, OptionsRequestForCors) {
    httplib::Client cli("http://127.0.0.1:8082");
    auto res = cli.Options("/api/patients/1");
    EXPECT_EQ(res->status, 200);
    EXPECT_EQ(res->get_header_value("Access-Control-Allow-Methods"), "GET, POST, PUT, DELETE, OPTIONS");
}

TEST_F(ApiServerTest, PutEmptyBodyReturns400) {
    httplib::Client cli("http://127.0.0.1:8082");
    auto res = cli.Put("/api/patients/1", "", "application/json");
    EXPECT_EQ(res->status, 400);
}

TEST_F(ApiServerTest, UpdateBirthDateAndVerify) {
    httplib::Client cli("http://127.0.0.1:8082");
    json update_p = {{"birth_date", "1985-10-10"}};
    cli.Put("/api/patients/1", update_p.dump(), "application/json");
    
    auto updated = repo->get_patient(1);
    EXPECT_EQ(updated->birth_date, "1985-10-10");
}

TEST_F(ApiServerTest, CanDeletePatient) {
    httplib::Client cli("http://127.0.0.1:8082");
    auto res = cli.Delete("/api/patients/1");
    ASSERT_EQ(res->status, 200);
    auto res_list = cli.Get("/api/patients");
    auto j = json::parse(res_list->body);
    EXPECT_EQ(j.size(), 0);
}

} // namespace clinic
