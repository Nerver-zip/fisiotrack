#include <gtest/gtest.h>
#include "../include/clinic/session_manager.hpp"
#include <thread>

using namespace clinic;

TEST(SessionManagerTest, CreateAndValidateSession) {
    SessionManager sm(1);
    std::string token = sm.create_session();
    EXPECT_FALSE(token.empty());
    EXPECT_TRUE(sm.validate_session(token));
}

TEST(SessionManagerTest, InvalidateSession) {
    SessionManager sm(1);
    std::string token = sm.create_session();
    sm.invalidate_session(token);
    EXPECT_FALSE(sm.validate_session(token));
}

TEST(SessionManagerTest, SessionTimeout) {
    // Timeout de 0 minutos para expirar imediatamente (se a implementação permitir 0)
    // Ou apenas testar que expira após o tempo.
    SessionManager sm(-1); // Forçar expiração
    std::string token = sm.create_session();
    EXPECT_FALSE(sm.validate_session(token));
}

TEST(SessionManagerTest, MultipleSessions) {
    SessionManager sm(1);
    std::string t1 = sm.create_session();
    std::string t2 = sm.create_session();
    
    EXPECT_NE(t1, t2);
    EXPECT_TRUE(sm.validate_session(t1));
    EXPECT_TRUE(sm.validate_session(t2));
    EXPECT_EQ(sm.active_sessions_count(), 2);
}
