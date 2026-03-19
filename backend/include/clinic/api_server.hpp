#pragma once

#include <httplib.h>
#include <memory>
#include <string>
#include "patient_repository.hpp"
#include "session_manager.hpp"
#include "backup_manager.hpp"
#include <filesystem>

namespace clinic {

/**
 * @brief Responsável por expor a lógica do repositório via interface HTTP/REST.
 * Segue o princípio de responsabilidade única: cuida apenas da camada web.
 */
class ApiServer {
public:
    explicit ApiServer(std::shared_ptr<PatientRepository> repo);
    explicit ApiServer(std::shared_ptr<PatientRepository> repo, const std::filesystem::path& root_path);
    
    void listen(const std::string& host, int port);
    void stop();

private:
    void setup_routes();
    void setup_cors();
    bool is_authorized(const httplib::Request& req);

    httplib::Server m_svr;
    std::shared_ptr<PatientRepository> m_repo;
    SessionManager m_session_manager;
    BackupManager m_backup_manager;
};

} // namespace clinic
