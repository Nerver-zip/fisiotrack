#include <gtest/gtest.h>
#include <httplib.h>
#include <nlohmann/json.hpp>
#include <thread>
#include <chrono>
#include <filesystem>
#include "../include/clinic/api_server.hpp"
#include "../include/clinic/sqlite_database.hpp"

using namespace clinic;
using json = nlohmann::json;

class BackupApiTest : public ::testing::Test {
protected:
    void SetUp() override {
        m_temp_dir = std::filesystem::temp_directory_path() / "fisiotrack_backup_test";
        std::filesystem::remove_all(m_temp_dir);
        std::filesystem::create_directories(m_temp_dir / "database");

        auto repo = std::make_shared<PatientRepository>(std::make_unique<SqliteDatabase>());
        ASSERT_TRUE(repo->initialize((m_temp_dir / "database" / "patients.db").string()));
        server = std::make_unique<ApiServer>(repo, m_temp_dir);
        
        // Credencial sintética de aplicativo instalado: o teste nunca lê segredos locais.
        std::filesystem::create_directories(m_temp_dir / "config");
        std::filesystem::path target_secrets = m_temp_dir / "config" / "client_secrets.json";
        std::ofstream mock_f(target_secrets);
        mock_f << "{\"installed\":{\"client_id\":\"mock_id\",\"client_secret\":\"mock_secret\"}}";
        mock_f.close();

        server_thread = std::thread([this]() {
            server->listen("127.0.0.1", 8081);
        });

        // Aguarda servidor subir
        std::this_thread::sleep_for(std::chrono::milliseconds(500));

        // Configura o armazenamento da instalação.
        httplib::Client cli("127.0.0.1", 8081);
        auto res = cli.Post("/api/auth/setup", json({{"password", "TestPass1"}}).dump(), "application/json");
        ASSERT_TRUE(res) << "Servidor de teste não aceitou a conexão";
        ASSERT_EQ(res->status, 201);
        token = json::parse(res->body)["token"];
    }

    void TearDown() override {
        server->stop();
        if (server_thread.joinable()) server_thread.join();
        std::filesystem::remove_all(m_temp_dir);
    }

    std::filesystem::path m_temp_dir;
    std::unique_ptr<ApiServer> server;
    std::thread server_thread;
    std::string token;
};

TEST_F(BackupApiTest, BackupEndpointReturnsSuccessOrError) {
    httplib::Client cli("127.0.0.1", 8081);
    httplib::Headers headers = {{"Authorization", "Bearer " + token}};

    json patient = {{"name", "Paciente do Backup"}, {"phone", json::array({"1111"})}};
    auto created = cli.Post("/api/patients", headers, patient.dump(), "application/json");
    ASSERT_TRUE(created);
    ASSERT_EQ(created->status, 201);

    auto res = cli.Post("/api/backup", headers, "", "application/json");
    
    // O endpoint deve responder (mesmo que com erro de upload 502)
    ASSERT_TRUE(res->status == 200 || res->status == 502);
    
    auto j = json::parse(res->body);
    std::string backup_file = j["file"];
    
    // VERIFICAÇÃO FÍSICA NO DISCO
    EXPECT_TRUE(std::filesystem::exists(backup_file)) << "Arquivo de backup nao foi criado em: " << backup_file;
    
    if (std::filesystem::exists(backup_file)) {
        EXPECT_GT(std::filesystem::file_size(backup_file), 0);
        SqliteDatabase restored;
        ASSERT_TRUE(restored.open(backup_file, "TestPass1"));
        const auto restored_patients = restored.get_all_patients();
        ASSERT_EQ(restored_patients.size(), 1);
        EXPECT_EQ(restored_patients.front().name, "Paciente do Backup");
        restored.close();
    }

    if (res->status == 200) {
        EXPECT_EQ(j["status"], "ok");
    } else {
        EXPECT_TRUE(j.contains("error"));
        EXPECT_TRUE(j["local_backup_created"].get<bool>());
    }
}

TEST_F(BackupApiTest, UnauthorizedAccessReturns401) {
    httplib::Client cli("127.0.0.1", 8081);
    auto res = cli.Post("/api/backup", {}, "", "application/json");
    EXPECT_EQ(res->status, 401);
}

TEST_F(BackupApiTest, CloudConfigGetAndUpdate) {
    httplib::Client cli("127.0.0.1", 8081);
    httplib::Headers headers = {{"Authorization", "Bearer " + token}};

    // 1. Get inicial (deve ser desabilitado e sem token)
    auto res_get = cli.Get("/api/backup/config", headers);
    ASSERT_EQ(res_get->status, 200);
    auto j_get = json::parse(res_get->body);
    EXPECT_FALSE(j_get["is_enabled"]);
    EXPECT_FALSE(j_get["has_token"]);

    // 2. Update folder_id e habilitar
    json update = {{"folder_id", "folder123"}, {"is_enabled", true}};
    auto res_post = cli.Post("/api/backup/config", headers, update.dump(), "application/json");
    ASSERT_EQ(res_post->status, 200);

    // 3. Get final para confirmar (folder_id deve estar lá)
    auto res_get2 = cli.Get("/api/backup/config", headers);
    ASSERT_EQ(res_get2->status, 200);
    auto j_get2 = json::parse(res_get2->body);
    EXPECT_TRUE(j_get2["is_enabled"]);
    EXPECT_EQ(j_get2["folder_id"], "folder123");
}

TEST_F(BackupApiTest, GetAuthUrl) {
    httplib::Client cli("127.0.0.1", 8081);
    httplib::Headers headers = {{"Authorization", "Bearer " + token}};

    auto res = cli.Get("/api/backup/auth/url", headers);
    ASSERT_EQ(res->status, 200);
    auto j = json::parse(res->body);
    std::string url = j["url"];
    EXPECT_TRUE(url.find("accounts.google.com") != std::string::npos);
    EXPECT_TRUE(url.find("client_id=") != std::string::npos);
}
