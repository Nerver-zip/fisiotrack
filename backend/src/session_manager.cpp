#include "../include/clinic/session_manager.hpp"
#include <openssl/rand.h>
#include <sstream>
#include <iomanip>

namespace clinic {

SessionManager::SessionManager(int timeout_minutes) : m_timeout_minutes(timeout_minutes) {}

std::string SessionManager::generate_secure_token() {
    unsigned char buffer[32];
    if (RAND_bytes(buffer, sizeof(buffer)) != 1) {
        return "";
    }
    
    std::stringstream ss;
    for (int i = 0; i < 32; ++i) {
        ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(buffer[i]);
    }
    return ss.str();
}

std::string SessionManager::create_session() {
    std::lock_guard<std::mutex> lock(m_mutex);
    std::string token = generate_secure_token();
    if (!token.empty()) {
        m_sessions[token] = {std::chrono::steady_clock::now()};
    }
    return token;
}

bool SessionManager::validate_session(const std::string& token) {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_sessions.find(token);
    if (it == m_sessions.end()) {
        return false;
    }

    auto now = std::chrono::steady_clock::now();
    auto elapsed = std::chrono::duration_cast<std::chrono::minutes>(now - it->second.last_accessed).count();

    if (elapsed > m_timeout_minutes) {
        m_sessions.erase(it);
        return false;
    }

    // Atualiza o timestamp de último acesso (idle timeout)
    it->second.last_accessed = now;
    return true;
}

void SessionManager::invalidate_session(const std::string& token) {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_sessions.erase(token);
}

void SessionManager::cleanup_expired() {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto now = std::chrono::steady_clock::now();
    for (auto it = m_sessions.begin(); it != m_sessions.end(); ) {
        auto elapsed = std::chrono::duration_cast<std::chrono::minutes>(now - it->second.last_accessed).count();
        if (elapsed > m_timeout_minutes) {
            it = m_sessions.erase(it);
        } else {
            ++it;
        }
    }
}

size_t SessionManager::active_sessions_count() {
    // É recomendado chamar cleanup_expired antes de verificar a contagem se quisermos o valor exato,
    // mas por simplicidade e performance, faremos a limpeza aqui também antes de retornar.
    std::lock_guard<std::mutex> lock(m_mutex);
    auto now = std::chrono::steady_clock::now();
    for (auto it = m_sessions.begin(); it != m_sessions.end(); ) {
        auto elapsed = std::chrono::duration_cast<std::chrono::minutes>(now - it->second.last_accessed).count();
        if (elapsed > m_timeout_minutes) {
            it = m_sessions.erase(it);
        } else {
            ++it;
        }
    }
    return m_sessions.size();
}

void SessionManager::clear_all() {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_sessions.clear();
}

} // namespace clinic
