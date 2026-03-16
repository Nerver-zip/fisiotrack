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
        // Mock das dependências
        auto mock_db = std::make_unique<MockDatabase>();
        auto repo = std::make_shared<PatientRepository>(std::move(mock_db));
        
        // Configura paciente inicial para testes de GET/DELETE
        Patient p;
        p.healthcare_id = "0004100020040013423002";
        p.name = "Test API";
        p.mom_name = "Maria";
        p.phone = {"123"};
        repo->add_patient(p);
        
        server = std::make_unique<ApiServer>(repo);
        
        // Inicia servidor em uma thread separada para não bloquear os testes
        server_thread = std::thread([this]() {
            server->listen("127.0.0.1", 8081);
        });
        
        // Espera um pouco para o servidor subir
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }

    void TearDown() override {
        server->stop();
        if (server_thread.joinable()) {
            server_thread.join();
        }
    }

    std::unique_ptr<ApiServer> server;
    std::thread server_thread;
};

TEST_F(ApiServerTest, CanListPatients) {
    httplib::Client cli("http://127.0.0.1:8081");
    auto res = cli.Get("/api/patients");
    
    ASSERT_EQ(res->status, 200);
    auto j = json::parse(res->body);
    ASSERT_TRUE(j.is_array());
    EXPECT_EQ(j.size(), 1);
    EXPECT_EQ(j[0]["name"], "Test API");
}

TEST_F(ApiServerTest, CanSearchPatients) {
    httplib::Client cli("http://127.0.0.1:8081");
    auto res = cli.Get("/api/patients?q=test");
    
    ASSERT_EQ(res->status, 200);
    auto j = json::parse(res->body);
    EXPECT_EQ(j.size(), 1);
}

TEST_F(ApiServerTest, CanCreatePatientViaPost) {
    httplib::Client cli("http://127.0.0.1:8081");
    json new_p = {
        {"healthcare_id", "0004100020040013423002"}, 
        {"name", "New POST Patient"}, 
        {"mom_name", "Maria"},
        {"birth_date", ""}, 
        {"cpf", "000"},
        {"gender", ""},
        {"address", ""}, 
        {"profession", ""}, 
        {"phone", {"123", "456"}},
        {"evaluations", json::array()}
    };
    
    auto res = cli.Post("/api/patients", new_p.dump(), "application/json");
    ASSERT_EQ(res->status, 201);
    
    // Verifica se foi inserido mesmo
    auto res_list = cli.Get("/api/patients");
    auto j = json::parse(res_list->body);
    EXPECT_EQ(j.size(), 2);
}

TEST_F(ApiServerTest, CanDeletePatient) {
    httplib::Client cli("http://127.0.0.1:8081");
    // O ID do paciente inicial é 1
    auto res = cli.Delete("/api/patients/1");
    ASSERT_EQ(res->status, 200);
    
    // Verifica se a lista está vazia agora
    auto res_list = cli.Get("/api/patients");
    auto j = json::parse(res_list->body);
    EXPECT_EQ(j.size(), 0);
}

} // namespace clinic
