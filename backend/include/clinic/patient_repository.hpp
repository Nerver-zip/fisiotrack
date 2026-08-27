#pragma once

#include "database_interface.hpp"
#include "patient.hpp"
#include <memory>
#include <vector>
#include <optional>
#include <string>
#include <map>
#include <algorithm>
#include <array>
#include <openssl/crypto.h>
#include <openssl/sha.h>

#include <filesystem>

namespace clinic {

/**
 * @brief Repositório para gerenciar a lógica de pacientes.
 * Atua como uma camada de abstração entre a aplicação e o banco de dados.
 */
class PatientRepository {
public:
    explicit PatientRepository(std::unique_ptr<IDatabase> db) : m_db(std::move(db)) {}

    bool initialize(const std::string& db_path) {
        m_db_path = db_path;
        return true;
    }

    bool is_initialized() const {
        if (m_db_path.empty()) return false;
        return std::filesystem::exists(m_db_path);
    }

    bool authenticate(const std::string& password) {
        if (m_db_path.empty()) return false;
        const auto verifier = password_verifier(password);
        if (m_db->is_open()) {
            return m_has_password_verifier &&
                CRYPTO_memcmp(verifier.data(), m_password_verifier.data(), verifier.size()) == 0;
        }
        if (!m_db->open(m_db_path, password)) return false;
        m_password_verifier = verifier;
        m_has_password_verifier = true;
        return true;
    }

    bool is_authenticated() const {
        return m_db->is_open();
    }

    void logout() {
        m_db->close();
        m_password_verifier.fill(0);
        m_has_password_verifier = false;
    }

    bool add_patient(const Patient& p, const std::string& user_info = "system") { 
        bool success = m_db->add_patient(p); 
        if (success) {
            m_db->add_audit_log("CREATE_PATIENT", 0, "Name: " + p.name, user_info);
        }
        return success;
    }

    std::optional<Patient> get_patient(int id) { return m_db->get_patient(id); }
    std::vector<Patient> get_all_patients() { return m_db->get_all_patients(); }
    std::vector<Patient> get_all_patients_full() { return m_db->get_all_patients_full(); }
    std::vector<Patient> search_patients(const std::string& query) { return m_db->search_patients(query); }

    bool update_patient(const Patient& p, const std::string& user_info = "system") { 
        bool success = m_db->update_patient(p); 
        if (success && p.id) {
            m_db->add_audit_log("UPDATE_PATIENT", *p.id, "Name: " + p.name, user_info);
        }
        return success;
    }

    bool delete_patient(int id, const std::string& user_info = "system") { 
        bool success = m_db->delete_patient(id); 
        if (success) {
            m_db->add_audit_log("DELETE_PATIENT", id, "", user_info);
        }
        return success;
    }

    void import_patients(const std::vector<Patient>& patients, const std::string& user_info = "system") {
        m_db->add_audit_log("IMPORT_START", 0, "Count: " + std::to_string(patients.size()), user_info);
        std::map<std::string, Patient> merged_patients;
        for (const auto& p : patients) {
            if (p.name.empty()) continue;

            if (merged_patients.find(p.name) == merged_patients.end()) {
                merged_patients[p.name] = p;
            } else {
                auto& existing = merged_patients[p.name];
                for (const auto& phone : p.phone) {
                    if (std::find(existing.phone.begin(), existing.phone.end(), phone) == existing.phone.end()) {
                        existing.phone.push_back(phone);
                    }
                }
                existing.evaluations.insert(existing.evaluations.end(), p.evaluations.begin(), p.evaluations.end());
            }
        }

        for (auto const& [name, p] : merged_patients) {
            auto existing_list = search_patients(name);
            std::optional<Patient> db_patient;
            for (const auto& ep : existing_list) {
                if (ep.name == name) {
                    db_patient = get_patient(*ep.id);
                    break;
                }
            }

            if (db_patient) {
                bool updated = false;
                for (const auto& phone : p.phone) {
                    if (std::find(db_patient->phone.begin(), db_patient->phone.end(), phone) == db_patient->phone.end()) {
                        db_patient->phone.push_back(phone);
                        updated = true;
                    }
                }
                if (updated) update_patient(*db_patient, user_info);

                for (auto eval : p.evaluations) {
                    eval.patient_id = *db_patient->id;
                    add_evaluation(eval, user_info);
                }
            } else {
                add_patient(p, user_info);
            }
        }
        m_db->add_audit_log("IMPORT_END", 0, "", user_info);
    }

    // --- Avaliações ---
    bool add_evaluation(const Evaluation& e, const std::string& user_info = "system") { 
        bool success = m_db->add_evaluation(e); 
        if (success) {
            m_db->add_audit_log("CREATE_EVALUATION", e.patient_id, "Date: " + e.evaluation_date, user_info);
        }
        return success;
    }

    std::vector<Evaluation> get_patient_evaluations(int patient_id) { return m_db->get_patient_evaluations(patient_id); }

    bool update_evaluation(const Evaluation& e, const std::string& user_info = "system") { 
        bool success = m_db->update_evaluation(e); 
        if (success && e.id) {
            m_db->add_audit_log("UPDATE_EVALUATION", e.patient_id, "Eval ID: " + std::to_string(*e.id), user_info);
        }
        return success;
    }

    bool delete_evaluation(int id, const std::string& user_info = "system") { 
        bool success = m_db->delete_evaluation(id); 
        if (success) {
            m_db->add_audit_log("DELETE_EVALUATION", 0, "Eval ID: " + std::to_string(id), user_info);
        }
        return success;
    }

    // --- Agendamentos ---
    bool add_appointment(const Appointment& a, const std::string& user_info = "system") {
        bool success = m_db->add_appointment(a);
        if (success) {
            m_db->add_audit_log("CREATE_APPOINTMENT", 0, "Patient: " + a.patient_name + " Date: " + a.appointment_date, user_info);
        }
        return success;
    }

    std::vector<Appointment> get_appointments(const std::string& date) {
        return m_db->get_appointments(date);
    }

    std::vector<Appointment> get_patient_appointments(int patient_id) {
        return m_db->get_patient_appointments(patient_id);
    }

    bool update_appointment(const Appointment& a, const std::string& user_info = "system") {
        bool success = m_db->update_appointment(a);
        if (success && a.id) {
            m_db->add_audit_log("UPDATE_APPOINTMENT", *a.id, "Patient: " + a.patient_name + " Date: " + a.appointment_date, user_info);
        }
        return success;
    }

    bool delete_appointment(int id, const std::string& user_info = "system") {
        bool success = m_db->delete_appointment(id);
        if (success) {
            m_db->add_audit_log("DELETE_APPOINTMENT", id, "", user_info);
        }
        return success;
    }

    std::vector<AuditLog> get_audit_logs(int limit = 100) {
        return m_db->get_audit_logs(limit);
    }

    bool create_backup(const std::string& target_path) {
        return m_db->create_backup(target_path);
    }

    std::optional<CloudConfig> get_cloud_config() {
        return m_db->get_cloud_config();
    }

    bool update_cloud_config(const CloudConfig& config, const std::string& user_info = "system") {
        bool success = m_db->update_cloud_config(config);
        if (success) {
            m_db->add_audit_log("UPDATE_CLOUD_CONFIG", 0, "Provider: " + config.provider, user_info);
        }
        return success;
    }

    IDatabase* get_database() {
        return m_db.get();
    }

private:
    static std::array<unsigned char, SHA256_DIGEST_LENGTH> password_verifier(const std::string& password) {
        std::array<unsigned char, SHA256_DIGEST_LENGTH> digest{};
        SHA256(reinterpret_cast<const unsigned char*>(password.data()), password.size(), digest.data());
        return digest;
    }

    std::unique_ptr<IDatabase> m_db;
    std::string m_db_path;
    std::array<unsigned char, SHA256_DIGEST_LENGTH> m_password_verifier{};
    bool m_has_password_verifier = false;
};

} // namespace clinic
