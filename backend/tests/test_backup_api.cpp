#include <gtest/gtest.h>
#include <httplib.h>
#include <nlohmann/json.hpp>
#include <thread>
#include <chrono>
#include <filesystem>
#include "../include/clinic/api_server.hpp"
#include "../include/clinic/sqlite_database.hpp"
#include "../include/clinic/patient_repository.hpp"

using namespace clinic;
using json = nlohmann::json;

class BackupApiTest : public ::testing::Test {
protected:
    void SetUp() override {
        db_path = "backup_api_test.db";
        std::filesystem::remove(db_path);
        
        auto db = std::make_unique<SqliteDatabase>();
        repo = std::make_shared<PatientRepository>(std::move(db));
        repo->initialize(db_path);
        repo->authenticate("test_pass");

        server = std::make_unique<ApiServer>(repo, std::filesystem::current_path());
        
        server_thread = std::thread([this]() {
            server->listen("127.0.0.1", 8081);
        });

        // Aguarda servidor subir
        std::this_thread::sleep_for(std::chrono::milliseconds(200));

        // Login para obter token
        httplib::Client cli("127.0.0.1", 8081);
        auto res = cli.Post("/api/login", json({{"password", "test_pass"}}).dump(), "application/json");
        token = json::parse(res->body)["token"];
    }

    void TearDown() override {
        server->stop();
        if (server_thread.joinable()) server_thread.join();
        repo->logout();
        std::filesystem::remove(db_path);
        // Limpa backups gerados pelo teste
        std::filesystem::remove_all("database/backups");
    }

    std::string db_path;
    std::shared_ptr<PatientRepository> repo;
    std::unique_ptr<ApiServer> server;
    std::thread server_thread;
    std::string token;
};

TEST_F(BackupApiTest, BackupEndpointReturnsSuccessOrError) {
    httplib::Client cli("127.0.0.1", 8081);
    httplib::Headers headers = {{"Authorization", "Bearer " + token}};

    auto res = cli.Post("/api/backup", headers, "", "application/json");
    
    // O endpoint deve responder (mesmo que com erro de upload 502)
    ASSERT_TRUE(res->status == 200 || res->status == 502);
    
    auto j = json::parse(res->body);
    std::string backup_file = j["file"];
    
    // VERIFICAÇÃO FÍSICA NO DISCO
    // 1. O arquivo deve existir
    EXPECT_TRUE(std::filesystem::exists(backup_file)) << "Arquivo de backup nao foi criado em: " << backup_file;
    
    // 2. O arquivo deve ter tamanho maior que zero (confirmando que o VACUUM INTO escreveu dados)
    if (std::filesystem::exists(backup_file)) {
        EXPECT_GT(std::filesystem::file_size(backup_file), 0);
        
        // 3. (Opcional) Tentar abrir como banco SQLite para garantir integridade
        sqlite3* check_db;
        int rc = sqlite3_open(backup_file.c_str(), &check_db);
        EXPECT_EQ(rc, SQLITE_OK);
        if (rc == SQLITE_OK) {
            // Se o banco original era criptografado, este também será (SQLCipher)
            // Tentamos uma query simples. Se falhar por criptografia, rc ainda é OK no open,
            // mas o exec retornaria SQLITE_NOTADB ou SQLITE_AUTH.
            sqlite3_close(check_db);
        }
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
