cmake_minimum_required(VERSION 3.20)
project(FisioTrack VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

if(MSVC)
    add_compile_options(/utf-8 /permissive- /Zc:__cplusplus)
endif()

include(FetchContent)

# --- 1. Dependências Externas ---

# Google Test
FetchContent_Declare(googletest URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.tar.gz)
set(INSTALL_GTEST OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

# JSON para C++
FetchContent_Declare(json URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz)
FetchContent_MakeAvailable(json)

# HTTP Server para C++
FetchContent_Declare(httplib URL https://github.com/yhirose/cpp-httplib/archive/refs/tags/v0.14.3.tar.gz)
FetchContent_MakeAvailable(httplib)

# --- 2. SQLCipher e OpenSSL ---
find_package(sqlcipher CONFIG QUIET)
if(sqlcipher_FOUND)
    set(SQLCIPHER_LIBS sqlcipher::sqlcipher)
else()
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(SQLCIPHER REQUIRED sqlcipher)
    set(SQLCIPHER_LIBS ${SQLCIPHER_LIBRARIES})
endif()
find_package(OpenSSL REQUIRED)

# --- 3. Configuração do Backend ---
set(SOURCES 
    src/sqlite_database.cpp
    src/api_server.cpp
    src/session_manager.cpp
)
# Criar a biblioteca
add_library(clinic_lib STATIC ${SOURCES})
if(sqlcipher_FOUND)
    target_include_directories(clinic_lib PRIVATE include)
else()
    target_include_directories(clinic_lib PRIVATE include ${SQLCIPHER_INCLUDE_DIRS})
endif()
target_compile_definitions(clinic_lib PRIVATE SQLITE_HAS_CODEC)
target_link_libraries(clinic_lib PUBLIC 
    ${SQLCIPHER_LIBS} 
    OpenSSL::SSL 
    OpenSSL::Crypto 
    nlohmann_json::nlohmann_json
    httplib::httplib
)

# Executável do Servidor (API)
add_executable(fisio_track_server src/main.cpp)
target_link_libraries(fisio_track_server PRIVATE clinic_lib)

# --- 4. Testes Unitários ---
enable_testing()
add_executable(unit_tests 
    tests/test_patient_crud.cpp
    tests/test_patient_repository.cpp
    tests/test_database_disk_integrity.cpp
    tests/test_api_server.cpp
    tests/test_import_logic.cpp
    tests/test_session_manager.cpp
    tests/test_audit_logs.cpp
    tests/test_backup_api.cpp
    tests/test_patients_features.cpp
)

target_link_libraries(unit_tests PRIVATE clinic_lib gtest_main)
include(GoogleTest)
gtest_discover_tests(unit_tests)

if(CMAKE_EXPORT_COMPILE_COMMANDS)
    add_custom_target(copy_compile_commands ALL
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
        ${CMAKE_BINARY_DIR}/compile_commands.json
        ${CMAKE_SOURCE_DIR}/../compile_commands.json
        DEPENDS ${CMAKE_BINARY_DIR}/compile_commands.json
    )
endif()
