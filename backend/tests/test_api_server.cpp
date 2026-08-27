#include <gtest/gtest.h>
#include <httplib.h>
#include <nlohmann/json.hpp>
#include <thread>
#include <chrono>
#include <filesystem>
#include <fstream>
#include "../include/clinic/api_server.hpp"
#include "../include/clinic/sqlite_database.hpp"

namespace clinic {

using json = nlohmann::json;

class ApiServerTest : public ::testing::Test {
protected:
    void SetUp() override {
        m_temp_dir = std::filesystem::temp_directory_path() / "fisiotrack_test";
        std::filesystem::remove_all(m_temp_dir);
        std::filesystem::create_directories(m_temp_dir / "database");
        std::filesystem::create_directories(m_temp_dir / "frontend" / "build");
        std::ofstream(m_temp_dir / "frontend" / "build" / "index.html") << "<!doctype html><title>FisioTrack LAN</title>";

        auto repo = std::make_shared<PatientRepository>(std::make_unique<SqliteDatabase>());
        ASSERT_TRUE(repo->initialize((m_temp_dir / "database" / "patients.db").string()));
        server = std::make_unique<ApiServer>(repo, m_temp_dir);
        
        server_thread = std::thread([this]() {
            server->listen("127.0.0.1", 8084);
        });
        
        std::this_thread::sleep_for(std::chrono::milliseconds(500));

        // Configura o banco da instalação de teste.
        httplib::Client cli("127.0.0.1", 8084);
        auto res = cli.Post("/api/auth/setup", json({{"password", "TestPass1"}}).dump(), "application/json");
        ASSERT_TRUE(res) << "Servidor de teste não aceitou a conexão";
        ASSERT_EQ(res->status, 201);
        auto j = json::parse(res->body);
        m_token = j["token"];

        // Adiciona um paciente inicial
        json p = {
            {"healthcare_id", "SUS-123"},
            {"name", "Initial Patient"},
            {"phone", {"111"}}
        };
        cli.Post("/api/patients", auth_headers(), p.dump(), "application/json");
    }

    void TearDown() override {
        server->stop();
        if (server_thread.joinable()) {
            server_thread.join();
        }
        std::filesystem::remove_all(m_temp_dir);
    }

    httplib::Headers auth_headers() {
        return {{"Authorization", "Bearer " + m_token}};
    }

    std::filesystem::path m_temp_dir;
    std::unique_ptr<ApiServer> server;
    std::thread server_thread;
    std::string m_token;
};

TEST_F(ApiServerTest, LoginReturnsToken) {
    httplib::Client cli("127.0.0.1", 8084);
    auto res = cli.Post("/api/login", json({{"password", "TestPass1"}}).dump(), "application/json");
    ASSERT_EQ(res->status, 200);
    auto j = json::parse(res->body);
    EXPECT_FALSE(j["token"].get<std::string>().empty());
}

TEST_F(ApiServerTest, ProtectedRouteReturns401WithoutToken) {
    httplib::Client cli("127.0.0.1", 8084);
    auto res = cli.Get("/api/patients");
    EXPECT_EQ(res->status, 401);
}

TEST_F(ApiServerTest, CanListPatientsWithToken) {
    httplib::Client cli("127.0.0.1", 8084);
    auto res = cli.Get("/api/patients", auth_headers());
    ASSERT_EQ(res->status, 200);
    auto j = json::parse(res->body);
    EXPECT_TRUE(j.is_array());
    EXPECT_GE(j.size(), 1);
}

TEST_F(ApiServerTest, CanUpdatePatientViaPut) {
    httplib::Client cli("127.0.0.1", 8084);
    json update_p = {{"name", "Updated Name"}};
    auto res = cli.Put("/api/patients/1", auth_headers(), update_p.dump(), "application/json");
    ASSERT_EQ(res->status, 200);
}

TEST_F(ApiServerTest, LogoutInvalidatesToken) {
    httplib::Client cli("127.0.0.1", 8084);
    cli.Post("/api/logout", auth_headers(), "", "");
    
    auto res = cli.Get("/api/patients", auth_headers());
    EXPECT_EQ(res->status, 401);
}

TEST_F(ApiServerTest, MultipleSessionsShareClinicData) {
    httplib::Client cli("127.0.0.1", 8084);
    auto second_login = cli.Post("/api/login", json({{"password", "TestPass1"}}).dump(), "application/json");
    ASSERT_EQ(second_login->status, 200);
    const std::string second_token = json::parse(second_login->body)["token"];
    auto list = cli.Get("/api/patients", {{"Authorization", "Bearer " + second_token}});
    ASSERT_EQ(list->status, 200);
    EXPECT_EQ(json::parse(list->body).size(), 1);
}

TEST_F(ApiServerTest, WrongPasswordCannotOpenAnotherSession) {
    httplib::Client cli("127.0.0.1", 8084);
    auto response = cli.Post("/api/login", json({{"password", "WrongPass1"}}).dump(), "application/json");
    ASSERT_TRUE(response);
    EXPECT_EQ(response->status, 401);
}

TEST_F(ApiServerTest, ServesFrontendFromTheSameAddress) {
    httplib::Client cli("127.0.0.1", 8084);
    auto response = cli.Get("/");
    ASSERT_TRUE(response);
    EXPECT_EQ(response->status, 200);
    EXPECT_NE(response->body.find("FisioTrack LAN"), std::string::npos);
}

TEST_F(ApiServerTest, AllowsDevelopmentOriginFromTheSameHost) {
    httplib::Client cli("127.0.0.1", 8084);
    auto response = cli.Get("/api/auth/status", {{"Origin", "http://127.0.0.1:3000"}});
    ASSERT_TRUE(response);
    EXPECT_EQ(response->get_header_value("Access-Control-Allow-Origin"), "http://127.0.0.1:3000");
}

TEST_F(ApiServerTest, DoesNotAuthorizeAnUnrelatedBrowserOrigin) {
    httplib::Client cli("127.0.0.1", 8084);
    auto response = cli.Get("/api/auth/status", {{"Origin", "https://example.invalid"}});
    ASSERT_TRUE(response);
    EXPECT_FALSE(response->has_header("Access-Control-Allow-Origin"));
}

} // namespace clinic
