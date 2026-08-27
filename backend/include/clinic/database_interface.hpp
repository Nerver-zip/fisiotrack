#pragma once

#include <vector>
#include <optional>
#include "patient.hpp"

namespace clinic {

/**
 * @brief Interface genérica para persistência de dados (Versão Relacional).
 */
class IDatabase {
public:
    virtual ~IDatabase() = default;

    virtual bool open(const std::string& db_path, const std::string& key) = 0;
    virtual void close() = 0;
    virtual bool is_open() const = 0;

    // --- Pacientes ---
    virtual bool add_patient(const Patient& p) = 0;
    virtual std::optional<Patient> get_patient(int id) = 0;
    virtual std::vector<Patient> get_all_patients() = 0;
    virtual std::vector<Patient> get_all_patients_full() = 0;
    virtual std::vector<Patient> search_patients(const std::string& query) = 0;
    virtual bool update_patient(const Patient& p) = 0;
    virtual bool delete_patient(int id) = 0;
    virtual void import_patients(const std::vector<Patient>& patients) = 0;

    // --- Avaliações (Entradas Clínicas) ---
    virtual bool add_evaluation(const Evaluation& e) = 0;
    virtual std::vector<Evaluation> get_patient_evaluations(int patient_id) = 0;
    virtual bool update_evaluation(const Evaluation& e) = 0;
    virtual bool delete_evaluation(int id) = 0;

    // --- Agendamentos ---
    virtual bool add_appointment(const Appointment& a) = 0;
    virtual std::vector<Appointment> get_appointments(const std::string& date) = 0;
    virtual std::vector<Appointment> get_patient_appointments(int patient_id) = 0;
    virtual bool update_appointment(const Appointment& a) = 0;
    virtual bool delete_appointment(int id) = 0;

    // --- Auditoria ---
    virtual bool add_audit_log(const std::string& action, int entity_id, const std::string& details, const std::string& user_info) = 0;
    virtual std::vector<AuditLog> get_audit_logs(int limit = 100) = 0;

    // --- Backup ---
    virtual bool create_backup(const std::string& target_path) = 0;

    // --- Cloud Config ---
    virtual std::optional<CloudConfig> get_cloud_config() = 0;
    virtual bool update_cloud_config(const CloudConfig& config) = 0;
};

} // namespace clinic
