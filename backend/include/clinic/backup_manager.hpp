#pragma once

#include <string>
#include <ctime>
#include <filesystem>
#include <iostream>
#include <array>
#include <cstdio>
#include <sys/wait.h>
#include "patient_repository.hpp"

namespace clinic {

/**
 * @brief Gerencia a estratégia de backup (Rolling 4 semanas).
 */
class BackupManager {
public:
    struct BackupResult {
        bool local_success = false;
        bool upload_success = false;
        std::string local_path;
        std::string error_message;
    };

    explicit BackupManager(std::shared_ptr<PatientRepository> repo) : m_repo(repo) {}

    void set_project_root(const std::filesystem::path& root) {
        m_project_root = root;
    }

    /**
     * @brief Executa o backup local e prepara para upload.
     * @return Caminho do arquivo gerado ou string vazia se falhar.
     */
    BackupResult run_backup() {
        BackupResult result;
        try {
            // 1. Calcular semana do mês (1 a 4)
            std::time_t now = std::time(nullptr);
            std::tm* ltm = std::localtime(&now);
            int day = ltm->tm_mday;
            int week = ((day - 1) / 7) + 1;
            if (week > 4) week = 4; // Agrupa dias 29-31 na semana 4

            // 2. Garantir diretório temporário de backups na raiz do projeto
            std::filesystem::path backup_dir = m_project_root / "database" / "backups";
            std::filesystem::create_directories(backup_dir);

            std::string filename = "backup_semana_" + std::to_string(week) + ".db";
            std::filesystem::path target = backup_dir / filename;

            // 3. Executar o VACUUM INTO
            if (m_repo->create_backup(target.string())) {
                result.local_success = true;
                result.local_path = target.string();
                
                // 4. Disparar upload para GDrive via script Python usando caminhos absolutos
                // Nota: Usamos .venv (com ponto) conforme solicitado
                std::filesystem::path python_exe = m_project_root / ".venv" / "bin" / "python3";
                std::filesystem::path script_path = m_project_root / "scripts" / "gdrive_upload.py";

                if (!std::filesystem::exists(python_exe)) {
                    result.error_message = "Ambiente virtual nao encontrado em: " + python_exe.string();
                    return result;
                }

                std::string cmd = python_exe.string() + " " + script_path.string() + 
                                 " \"" + target.string() + "\" \"" + filename + "\" 2>&1";

                std::array<char, 256> buffer{};
                std::string script_output;
                FILE* pipe = popen(cmd.c_str(), "r");

                if (!pipe) {
                    result.error_message = "Falha ao iniciar o script de upload";
                    std::cerr << "❌ " << result.error_message << std::endl;
                    return result;
                }

                while (fgets(buffer.data(), static_cast<int>(buffer.size()), pipe) != nullptr) {
                    script_output += buffer.data();
                }

                int status = pclose(pipe);
                int res = WIFEXITED(status) ? WEXITSTATUS(status) : status;

                if (res == 0) {
                    result.upload_success = true;
                    m_repo->get_database()->add_audit_log("BACKUP_SUCCESS", 0, "Uploaded: " + filename, "system");
                    return result;
                } else {
                    std::string cleaned_output = script_output;
                    while (!cleaned_output.empty() && (cleaned_output.back() == '\n' || cleaned_output.back() == '\r')) {
                        cleaned_output.pop_back();
                    }
                    result.error_message = cleaned_output.empty()
                        ? "Script de upload falhou sem detalhes"
                        : cleaned_output;
                    m_repo->get_database()->add_audit_log("BACKUP_UPLOAD_FAIL", 0, "Failed to upload: " + filename, "system");
                    // Removido std::cerr para manter o console limpo em testes/produção
                    return result;
                }
            }
        } catch (const std::exception& e) {
            result.error_message = e.what();
            std::cerr << "❌ Erro crítico no backup: " << e.what() << std::endl;
        }
        return result;
    }

private:
    std::shared_ptr<PatientRepository> m_repo;
    std::filesystem::path m_project_root;
};

} // namespace clinic
