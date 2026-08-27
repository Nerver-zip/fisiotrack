cmake_minimum_required(VERSION 3.20)
cmake_policy(SET CMP0135 NEW)
project(FisioTrack VERSION 0.1.0 LANGUAGES C CXX)

enable_testing()

# --- Padrão C++ ---

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# --- Flags de compilação (boas práticas) ---

if(NOT MSVC)
add_compile_options(
-Wall
-Wextra
-Wpedantic
-Wshadow
-Wformat=2
-Wnull-dereference
-Wimplicit-fallthrough
)

# Debug vs Release
set(CMAKE_CXX_FLAGS_DEBUG "-g -O0")
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -march=native -DNDEBUG")

else()
add_compile_options(/W4 /permissive- /utf-8)
endif()

# --- Threads ---

set(THREADS_PREFER_PTHREAD_FLAG ON)
find_package(Threads REQUIRED)

include(FetchContent)

# --- GoogleTest ---

FetchContent_Declare(
googletest
URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.tar.gz
)
set(INSTALL_GTEST OFF CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

# --- JSON ---

FetchContent_Declare(
json
URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
)
FetchContent_MakeAvailable(json)

# --- HTTP ---

FetchContent_Declare(
httplib
URL https://github.com/yhirose/cpp-httplib/archive/refs/tags/v0.14.3.tar.gz
)
FetchContent_MakeAvailable(httplib)

# --- SQLCipher (Termux-safe) ---

find_package(PkgConfig REQUIRED)
pkg_check_modules(SQLCIPHER REQUIRED IMPORTED_TARGET sqlcipher)

# --- OpenSSL ---

find_package(OpenSSL REQUIRED)

# --- Sources ---

set(SOURCES
src/sqlite_database.cpp
src/api_server.cpp
src/session_manager.cpp
src/database_migration.cpp
)

# --- Biblioteca ---

add_library(clinic_lib STATIC ${SOURCES})

target_include_directories(clinic_lib PRIVATE
    include
    ${SQLCIPHER_INCLUDE_DIRS}
)

target_compile_options(clinic_lib PRIVATE
    ${SQLCIPHER_CFLAGS_OTHER}
)

target_compile_definitions(clinic_lib PRIVATE
    SQLITE_HAS_CODEC
)

target_link_libraries(clinic_lib PUBLIC
    Threads::Threads
    OpenSSL::SSL
    OpenSSL::Crypto
    PkgConfig::SQLCIPHER
    nlohmann_json::nlohmann_json
    httplib::httplib
)

# --- Executável ---

add_executable(fisio_track_server src/main.cpp)

target_link_libraries(fisio_track_server PRIVATE
    clinic_lib
)

# --- Testes ---

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
    tests/test_lan_access.cpp
    tests/test_database_migration.cpp
    tests/test_appointments.cpp
)

target_link_libraries(unit_tests PRIVATE
    clinic_lib
    gtest_main
    Threads::Threads
)

add_test(NAME unit_tests COMMAND unit_tests)
