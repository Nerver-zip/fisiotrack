#pragma once

#include "database_interface.hpp"
#include <sqlite3.h>
#ifdef __cplusplus
extern "C" {
#endif

int sqlite3_key(sqlite3*, const void*, int);
int sqlite3_key_v2(sqlite3*, const char*, const void*, int);
int sqlite3_rekey(sqlite3*, const void*, int);
int sqlite3_rekey_v2(sqlite3*, const char*, const void*, int);

#ifdef __cplusplus
}
#endif
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
    virtual std::vector<Patient> get_all_patients_full() override;
    virtual std::vector<Patient> search_patients(const std::string& query) override;
    virtual bool update_patient(const Patient& p) override;
    virtual bool delete_patient(int id) override;
    virtual void import_patients([[maybe_unused]] const std::vector<Patient>& patients) override {
        // A lógica de importação e mesclagem é gerenciada pelo repositório
    }

    // --- Avaliações ---
    virtual bool add_evaluation(const Evaluation& e) override;
    virtual std::vector<Evaluation> get_patient_evaluations(int patient_id) override;
    virtual bool update_evaluation(const Evaluation& e) override;
    virtual bool delete_evaluation(int id) override;

    // --- Agendamentos ---
    virtual bool add_appointment(const Appointment& a) override;
    virtual std::vector<Appointment> get_appointments(const std::string& date) override;
    virtual std::vector<Appointment> get_patient_appointments(int patient_id) override;
    virtual bool update_appointment(const Appointment& a) override;
    virtual bool delete_appointment(int id) override;

    // --- Auditoria ---
    virtual bool add_audit_log(const std::string& action, int entity_id, const std::string& details, const std::string& user_info) override;
    virtual std::vector<AuditLog> get_audit_logs(int limit = 100) override;

    // --- Backup ---
    virtual bool create_backup(const std::string& target_path) override;

    // --- Cloud Config ---
    virtual std::optional<CloudConfig> get_cloud_config() override;
    virtual bool update_cloud_config(const CloudConfig& config) override;

private:
    sqlite3* m_db;
};

} // namespace clinic
