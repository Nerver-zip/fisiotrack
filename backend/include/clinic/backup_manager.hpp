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

    explicit BackupManager(std::shared_ptr<PatientRepository> repo) : m_repo(std::move(repo)) {}

    void set_project_root(const std::filesystem::path& root) {
        m_project_root = root;
    }

    /**
     * @brief Executa o backup local e prepara para upload.
     * Estratégia de rotação: 30 dias (um backup por dia do mês).
     * @return Caminho do arquivo gerado ou string vazia se falhar.
     */
    BackupResult run_backup() {
        BackupResult result;
        try {
            // 1. Calcular dia do mês (1 a 31) para rotação diária de 30 dias
            std::time_t now = std::time(nullptr);
            std::tm* ltm = std::localtime(&now);
            int day = ltm->tm_mday; // 1 a 31

            // 2. Manter os backups da instalação em um diretório local dedicado.
            std::filesystem::path backup_dir = m_project_root / "database" / "backups";
            std::filesystem::create_directories(backup_dir);

            std::string filename = "backup_dia_" + std::to_string(day) + ".db";
            std::filesystem::path target = backup_dir / filename;

            // 3. Executar o VACUUM INTO
            if (m_repo->create_backup(target.string())) {
                std::filesystem::permissions(
                    target,
                    std::filesystem::perms::owner_read | std::filesystem::perms::owner_write,
                    std::filesystem::perm_options::replace
                );
                result.local_success = true;
                result.local_path = target.string();

                // Um backup local completo não depende de serviços externos.
                auto cloud_opt = m_repo->get_cloud_config();
                if (!cloud_opt || !cloud_opt->is_enabled || cloud_opt->refresh_token.empty()) {
                    m_repo->get_database()->add_audit_log("BACKUP_LOCAL_SUCCESS", 0, "Created: " + filename, "system");
                    return result;
                }

                // 4. Disparar upload para GDrive via script Python usando caminhos absolutos
                // Nota: Usamos .venv (com ponto) conforme solicitado
                std::filesystem::path python_exe = m_project_root / ".venv" / "bin" / "python3";
                std::filesystem::path script_path = m_project_root / "scripts" / "gdrive_upload.py";

                if (!std::filesystem::exists(python_exe)) {
                    result.error_message = "Ambiente virtual nao encontrado em: " + python_exe.string();
                    return result;
                }

                std::string cmd = shell_quote(python_exe.string()) + " " + shell_quote(script_path.string()) +
                                  " " + shell_quote(target.string()) + " " + shell_quote(filename) +
                                  " --refresh_token " + shell_quote(cloud_opt->refresh_token);
                if (!cloud_opt->folder_id.empty()) {
                    cmd += " --folder_id " + shell_quote(cloud_opt->folder_id);
                }

                cmd += " 2>&1";

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
    static std::string shell_quote(const std::string& value) {
        std::string quoted = "'";
        for (const char ch : value) {
            quoted += ch == '\'' ? "'\\''" : std::string(1, ch);
        }
        return quoted + "'";
    }

    std::shared_ptr<PatientRepository> m_repo;
    std::filesystem::path m_project_root;
};

} // namespace clinic
