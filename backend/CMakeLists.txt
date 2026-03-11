cmake_minimum_required(VERSION 3.20)
project(FisioTrack VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Configurações específicas para o compilador MSVC (Windows)
if(MSVC)
    add_compile_options(/utf-8 /permissive- /Zc:__cplusplus)
endif()

include(FetchContent)

# --- 1. Google Test (GTest) - Cross-platform via FetchContent ---
message(STATUS "Configurando Google Test...")
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.tar.gz
)
set(INSTALL_GTEST OFF CACHE BOOL "" FORCE)
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

# --- 2. SQLCipher e OpenSSL ---

# Tenta encontrar SQLCipher via CMake Config (padrão vcpkg no Windows)
find_package(sqlcipher CONFIG QUIET)

if(sqlcipher_FOUND)
    message(STATUS "SQLCipher encontrado via CMake Config.")
    set(SQLCIPHER_LIBS sqlcipher::sqlcipher)
else()
    # Fallback para PkgConfig (padrão Linux/macOS)
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(SQLCIPHER REQUIRED sqlcipher)
    set(SQLCIPHER_LIBS ${SQLCIPHER_LIBRARIES})
endif()

# OpenSSL (find_package já é cross-platform por padrão)
find_package(OpenSSL REQUIRED)

# --- 3. Configuração do Backend ---
set(SOURCES
    src/sqlite_database.cpp
)

add_library(clinic_lib STATIC ${SOURCES})

# Inclui os diretórios de include conforme o método de busca utilizado
if(sqlcipher_FOUND)
    target_include_directories(clinic_lib PRIVATE include)
else()
    target_include_directories(clinic_lib PRIVATE include ${SQLCIPHER_INCLUDE_DIRS})
endif()

target_compile_definitions(clinic_lib PRIVATE SQLITE_HAS_CODEC)
target_link_libraries(clinic_lib PUBLIC ${SQLCIPHER_LIBS} OpenSSL::SSL OpenSSL::Crypto)

# Executável do Servidor
add_executable(fisio_track_server src/main.cpp)
target_link_libraries(fisio_track_server PRIVATE clinic_lib)

# --- 4. Testes Unitários ---
enable_testing()
add_executable(unit_tests 
    tests/test_patient_crud.cpp
    tests/test_patient_repository.cpp
    tests/test_database_disk_integrity.cpp
)
target_link_libraries(unit_tests PRIVATE clinic_lib gtest_main)

include(GoogleTest)
gtest_discover_tests(unit_tests)
