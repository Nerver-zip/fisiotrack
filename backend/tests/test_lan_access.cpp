#include <gtest/gtest.h>
#include <httplib.h>
#include <nlohmann/json.hpp>
#include <atomic>
#include <chrono>
#include <filesystem>
#include <memory>
#include <thread>
#include <vector>
#include "../include/clinic/api_server.hpp"
#include "../include/clinic/sqlite_database.hpp"

namespace clinic {

using json = nlohmann::json;

TEST(LanAccessTest, ConcurrentWorkstationsShareOneDatabaseSafely) {
    const auto root = std::filesystem::temp_directory_path() / "fisiotrack_lan_test";
    std::filesystem::remove_all(root);
    std::filesystem::create_directories(root / "database");

    auto repo = std::make_shared<PatientRepository>(std::make_unique<SqliteDatabase>());
    ASSERT_TRUE(repo->initialize((root / "database" / "patients.db").string()));
    ApiServer server(repo, root);
    std::thread server_thread([&server]() { server.listen("127.0.0.1", 8085); });
    std::this_thread::sleep_for(std::chrono::milliseconds(300));

    httplib::Client setup_client("127.0.0.1", 8085);
    auto setup = setup_client.Post("/api/auth/setup", json({{"password", "TestPass1"}}).dump(), "application/json");
    if (!setup) {
        ADD_FAILURE() << "Servidor de teste não aceitou a conexão";
        server.stop();
        server_thread.join();
        std::filesystem::remove_all(root);
        return;
    }
    ASSERT_EQ(setup->status, 201);

    std::vector<std::string> tokens;
    for (int i = 0; i < 4; ++i) {
        auto login = setup_client.Post("/api/login", json({{"password", "TestPass1"}}).dump(), "application/json");
        ASSERT_TRUE(login);
        ASSERT_EQ(login->status, 200);
        tokens.push_back(json::parse(login->body)["token"]);
    }

    std::atomic<int> successes{0};
    std::vector<std::thread> workstations;
    for (int i = 0; i < 12; ++i) {
        workstations.emplace_back([i, &tokens, &successes]() {
            httplib::Client client("127.0.0.1", 8085);
            json patient = {{"name", "Paciente " + std::to_string(i)}, {"phone", json::array()}};
            httplib::Headers headers = {{"Authorization", "Bearer " + tokens[static_cast<size_t>(i) % tokens.size()]}};
            auto response = client.Post("/api/patients", headers, patient.dump(), "application/json");
            if (response && response->status == 201) ++successes;
        });
    }
    for (auto& workstation : workstations) workstation.join();

    auto list = setup_client.Get("/api/patients", {{"Authorization", "Bearer " + tokens.front()}});
    ASSERT_TRUE(list);
    ASSERT_EQ(list->status, 200);
    EXPECT_EQ(successes.load(), 12);
    EXPECT_EQ(json::parse(list->body).size(), 12);

    server.stop();
    server_thread.join();
    std::filesystem::remove_all(root);
}

} // namespace clinic
