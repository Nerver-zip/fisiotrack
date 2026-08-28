#pragma once

#include <httplib.h>
#include <memory>
#include <string>
#include "patient_repository.hpp"
#include "session_manager.hpp"
#include "backup_manager.hpp"
#include <filesystem>
#include <mutex>

namespace clinic {

/**
 * @brief Expõe a aplicação da clínica na rede local.
 */
class ApiServer {
public:
    explicit ApiServer(std::shared_ptr<PatientRepository> repo);
    ApiServer(std::shared_ptr<PatientRepository> repo, const std::filesystem::path& root_path);
    
    bool listen(const std::string& host, int port);
    void stop();

private:
    void setup_routes();
    void setup_cors();
    bool is_authorized(const httplib::Request& req);

    httplib::Server m_svr;
    std::shared_ptr<PatientRepository> m_repo;
    SessionManager m_session_manager;
    BackupManager m_backup_manager;
    std::filesystem::path m_root_path;
    std::mutex m_repository_mutex;
};

} // namespace clinic
