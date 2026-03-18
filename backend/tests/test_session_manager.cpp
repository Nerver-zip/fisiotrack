#include <gtest/gtest.h>
#include "../include/clinic/session_manager.hpp"

using namespace clinic;

TEST(SessionManagerTest, CreateAndValidateSession) {
    SessionManager sm(30);
    std::string token = sm.create_session();
    
    ASSERT_FALSE(token.empty());
    EXPECT_EQ(token.length(), 64); // 32 bytes em hex = 64 caracteres
    EXPECT_TRUE(sm.validate_session(token));
    EXPECT_EQ(sm.active_sessions_count(), 1);
}

TEST(SessionManagerTest, InvalidateSession) {
    SessionManager sm(30);
    std::string token = sm.create_session();
    
    sm.invalidate_session(token);
    EXPECT_FALSE(sm.validate_session(token));
    EXPECT_EQ(sm.active_sessions_count(), 0);
}

TEST(SessionManagerTest, SessionTimeout) {
    // Usamos um timeout de -1 minutos para que qualquer tempo decorrido (mesmo 0 minutos) acione a expiração
    SessionManager sm(-1); 
    std::string token = sm.create_session();
    
    // A validação deve falhar por causa da expiração
    EXPECT_FALSE(sm.validate_session(token));
    EXPECT_EQ(sm.active_sessions_count(), 0);
}

TEST(SessionManagerTest, MultipleSessions) {
    SessionManager sm(30);
    std::string t1 = sm.create_session();
    std::string t2 = sm.create_session();
    
    EXPECT_NE(t1, t2);
    EXPECT_EQ(sm.active_sessions_count(), 2);
    
    sm.invalidate_session(t1);
    EXPECT_EQ(sm.active_sessions_count(), 1);
    EXPECT_TRUE(sm.validate_session(t2));
    EXPECT_FALSE(sm.validate_session(t1));
}
