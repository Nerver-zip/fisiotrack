#pragma once

#include "database_interface.hpp"
#include <sqlite3.h>
#include <memory>
#include <string>

namespace clinic {

/**
 * @brief Implementação de banco de dados SQLite com SQLCipher para criptografia.
 */
class SqliteDatabase : public IDatabase {
public:
    SqliteDatabase() : m_db(nullptr) {}
    ~SqliteDatabase() override;

    bool open(const std::string& db_path, const std::string& key) override;
    void close() override;
    bool is_open() const override;

    // --- Pacientes ---
    virtual bool add_patient(const Patient& p) override;
    virtual std::optional<Patient> get_patient(int id) override;
    virtual std::vector<Patient> get_all_patients() override;
    virtual std::vector<Patient> search_patients(const std::string& query) override;
    virtual bool update_patient(const Patient& p) override;
    virtual bool delete_patient(int id) override;
    virtual void import_patients(const std::vector<Patient>& patients) override {
        // A lógica de importação e mesclagem é gerenciada pelo repositório
    }

    // --- Avaliações ---
    virtual bool add_evaluation(const Evaluation& e) override;
    virtual std::vector<Evaluation> get_patient_evaluations(int patient_id) override;
    virtual bool update_evaluation(const Evaluation& e) override;
    virtual bool delete_evaluation(int id) override;

    // --- Auditoria ---
    virtual bool add_audit_log(const std::string& action, int entity_id, const std::string& details, const std::string& user_info) override;
    virtual std::vector<AuditLog> get_audit_logs(int limit = 100) override;

    // --- Backup ---
    virtual bool create_backup(const std::string& target_path) override;

private:
    sqlite3* m_db;
};

} // namespace clinic
