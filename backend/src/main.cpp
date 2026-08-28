#include <iostream>
#include <fstream>
#include <memory>
#include <cstdlib>
#include <string>
#include <filesystem>
#include <atomic>
#include <cerrno>
#include <csignal>
#include <thread>
#include <pthread.h>
#include <sys/stat.h>
#include "../include/clinic/sqlite_database.hpp"
#include "../include/clinic/patient_repository.hpp"
#include "../include/clinic/api_server.hpp"
#include "../include/clinic/database_migration.hpp"

using namespace clinic;

/**
 * @brief Tenta encontrar a raiz do projeto procurando pelo arquivo .env
 */
std::filesystem::path find_project_root() {
    if (const char* configured_root = std::getenv("FISIOTRACK_ROOT")) {
        std::filesystem::path root(configured_root);
        if (root.is_relative()) root = std::filesystem::absolute(root);
        return root;
    }

    std::filesystem::path current = std::filesystem::current_path();
    while (true) {
        if (std::filesystem::exists(current / ".env") ||
            (std::filesystem::exists(current / "backend") && std::filesystem::exists(current / "frontend"))) {
            return current;
        }
        const auto parent = current.parent_path();
        if (parent == current) break;
        current = parent;
    }
    return std::filesystem::current_path();
}

/**
 * @brief Carrega variáveis de ambiente a partir de um arquivo .env.
 */
void load_env(const std::filesystem::path& path) {
    std::ifstream file(path);
    if (!file.is_open()) return;
    std::string line;
    while (std::getline(file, line)) {
        if (line.empty() || line[0] == '#') continue;
        size_t sep = line.find('=');
        if (sep != std::string::npos) {
            std::string key = line.substr(0, sep);
            std::string val = line.substr(sep + 1);
            if (!val.empty() && val.back() == '\r') val.pop_back();
            // Variáveis fornecidas pelo processo têm precedência sobre o arquivo.
            setenv(key.c_str(), val.c_str(), 0);
        }
    }
}

int main() {
    // Dados clínicos e segredos novos ficam acessíveis apenas ao usuário do processo.
    umask(S_IRWXG | S_IRWXO);
    std::filesystem::path root = find_project_root();
    load_env(root / ".env");

    const char* env_mode = std::getenv("DB_TYPE");
    const std::string mode = env_mode ? env_mode : "real";

    const char* configured_path = mode == "mock" ? std::getenv("DB_MOCK_PATH") : std::getenv("DB_REAL_PATH");
    std::filesystem::path db_path = configured_path
        ? std::filesystem::path(configured_path)
        : std::filesystem::path(mode == "mock" ? "database/mock_patients.db" : "database/patients.db");
    if (db_path.is_relative()) db_path = root / db_path;

    if (!prepare_database_storage(root, db_path, std::cout, std::cerr)) return 1;
    if (db_path.has_parent_path()) std::filesystem::create_directories(db_path.parent_path());

    auto repo = std::make_shared<PatientRepository>(std::make_unique<SqliteDatabase>());
    if (!repo->initialize(db_path.string())) {
        std::cerr << "Falha ao preparar o armazenamento local." << std::endl;
        return 1;
    }

    if (mode == "mock" && !repo->is_initialized()) {
        const char* mock_password = std::getenv("DB_MOCK_PASSWORD");
        if (mock_password && *mock_password && repo->authenticate(mock_password)) repo->logout();
    }

    const char* env_port = std::getenv("API_PORT");
    int port = env_port ? std::stoi(env_port) : 8080;
    const char* env_host = std::getenv("API_HOST");
    std::string host = env_host ? env_host : "127.0.0.1";

    std::cout << "Iniciando FisioTrack para a rede da clínica..." << std::endl;
    std::cout << "📂 Project Root: " << root << std::endl;
    std::cout << "📁 Banco de dados: " << db_path << std::endl;

    sigset_t shutdown_signals;
    sigemptyset(&shutdown_signals);
    sigaddset(&shutdown_signals, SIGINT);
    sigaddset(&shutdown_signals, SIGTERM);
    pthread_sigmask(SIG_BLOCK, &shutdown_signals, nullptr);

    ApiServer server(repo, root);
    std::atomic<bool> server_finished{false};
    bool listen_succeeded = false;
    std::thread server_thread([&]() {
        listen_succeeded = server.listen(host, port);
        server_finished = true;
    });

    while (!server_finished) {
        const timespec wait_interval{1, 0};
        const int received_signal = sigtimedwait(&shutdown_signals, nullptr, &wait_interval);
        if (received_signal == SIGINT || received_signal == SIGTERM) {
            std::cout << "Encerrando FisioTrack com segurança..." << std::endl;
            server.stop();
            break;
        }
        if (received_signal == -1 && errno != EAGAIN && errno != EINTR) {
            server.stop();
            break;
        }
    }

    if (server_thread.joinable()) server_thread.join();

    return listen_succeeded ? 0 : 1;
}
