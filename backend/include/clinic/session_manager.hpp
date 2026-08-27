#pragma once

#include <string>
#include <map>
#include <mutex>
#include <chrono>

namespace clinic {

/**
 * @brief Gerencia as sessões ativas do sistema.
 * Garante thread-safety e implementa idle timeout (expiração por inatividade).
 */
class SessionManager {
public:
    explicit SessionManager(int timeout_minutes = 30);

    // Gera um token criptograficamente seguro e cria uma nova sessão.
    std::string create_session();

    // Valida se o token existe e não está expirado. Atualiza o timestamp se válido.
    bool validate_session(const std::string& token);

    // Remove uma sessão específica
    void invalidate_session(const std::string& token);

    // Remove sessões que ultrapassaram o tempo de inatividade
    void cleanup_expired();

    // Retorna a quantidade de sessões ativas (não expiradas) no sistema todo
    size_t active_sessions_count();

    // Remove todas as sessões
    void clear_all();

private:
    std::string generate_secure_token();

    std::mutex m_mutex;
    int m_timeout_minutes;

    struct SessionInfo {
        std::chrono::steady_clock::time_point last_accessed;
    };

    std::map<std::string, SessionInfo> m_sessions;
};

} // namespace clinic
