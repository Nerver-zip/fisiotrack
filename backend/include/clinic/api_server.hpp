#pragma once

#include <httplib.h>
#include <memory>
#include "patient_repository.hpp"

namespace clinic {

/**
 * @brief Responsável por expor a lógica do repositório via interface HTTP/REST.
 * Segue o princípio de responsabilidade única: cuida apenas da camada web.
 */
class ApiServer {
public:
    explicit ApiServer(std::shared_ptr<PatientRepository> repo);
    
    void listen(const std::string& host, int port);
    void stop();

private:
    void setup_routes();
    void setup_cors();

    httplib::Server m_svr;
    std::shared_ptr<PatientRepository> m_repo;
};

} // namespace clinic
