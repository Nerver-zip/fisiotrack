#pragma once

#include "database_interface.hpp"
#include <map>
#include <algorithm>

namespace clinic {

/**
 * @brief Banco de dados em memória (Mock) para testes unitários rápidos (Versão Relacional).
 */
class MockDatabase : public IDatabase {
public:
    MockDatabase() : m_next_patient_id(1), m_next_eval_id(1), m_next_appt_id(1), m_is_open(false) {}
    ~MockDatabase() override = default;

    bool open(const std::string&, const std::string&) override { 
        m_is_open = true;
        return true; 
    }
    
    void close() override { 
        m_patients.clear(); 
        m_evaluations.clear(); 
        m_appointments.clear();
        m_next_patient_id = 1;
        m_next_eval_id = 1;
        m_next_appt_id = 1;
        m_is_open = false;
    }

    bool is_open() const override {
        return m_is_open;
    }

    // --- Pacientes ---
    bool add_patient(const Patient& p) override {
        Patient new_p = p;
        new_p.id = m_next_patient_id++;
        m_patients[new_p.id.value()] = new_p;
        // Simula o salvamento de avaliações em cascata
        for(const auto& eval : p.evaluations) {
            Evaluation e = eval;
            e.patient_id = *new_p.id;
            add_evaluation(e);
        }
        return true;
    }

    std::optional<Patient> get_patient(int id) override {
        if (m_patients.find(id) != m_patients.end()) {
            Patient p = m_patients[id];
            p.evaluations = get_patient_evaluations(id);
            return p;
        }
        return std::nullopt;
    }

    std::vector<Patient> get_all_patients() override {
        std::vector<Patient> all;
        for (auto const& [id, p] : m_patients) {
            all.push_back(p);
        }
        return all;
    }

    std::vector<Patient> get_all_patients_full() override {
        std::vector<Patient> all;
        for (auto const& [id, p] : m_patients) {
            Patient full_p = p;
            full_p.evaluations = get_patient_evaluations(id);
            all.push_back(full_p);
        }
        return all;
    }

    std::vector<Patient> search_patients(const std::string& query) override {
        std::vector<Patient> results;
        std::string q = query;
        std::transform(q.begin(), q.end(), q.begin(), ::tolower);
        for (auto const& [id, p] : m_patients) {
            std::string name = p.name;
            std::transform(name.begin(), name.end(), name.begin(), ::tolower);
            if (name.find(q) != std::string::npos) {
                results.push_back(p);
            }
        }
        return results;
    }

    bool update_patient(const Patient& p) override {
        if (p.id && m_patients.find(p.id.value()) != m_patients.end()) {
            m_patients[p.id.value()] = p;
            return true;
        }
        return false;
    }

    bool delete_patient(int id) override {
        m_evaluations.erase(id); // Limpa avaliações vinculadas (simplificado)
        return m_patients.erase(id) > 0;
    }

    void import_patients(const std::vector<Patient>& patients) override {
        for (const auto& p : patients) {
            add_patient(p);
        }
    }

    // --- Avaliações ---
    bool add_evaluation(const Evaluation& e) override {
        Evaluation new_e = e;
        new_e.id = m_next_eval_id++;
        m_evaluations[e.patient_id].push_back(new_e);
        return true;
    }

    std::vector<Evaluation> get_patient_evaluations(int patient_id) override {
        if (m_evaluations.find(patient_id) != m_evaluations.end()) {
            auto evals = m_evaluations[patient_id];
            std::sort(evals.begin(), evals.end(), [](const Evaluation& a, const Evaluation& b) {
                return a.evaluation_date > b.evaluation_date;
            });
            return evals;
        }
        return {};
    }

    bool update_evaluation(const Evaluation& e) override {
        if (!e.id) return false;
        auto& list = m_evaluations[e.patient_id];
        for (auto& item : list) {
            if (item.id == e.id) {
                item = e;
                return true;
            }
        }
        return false;
    }

    bool delete_evaluation(int id) override {
        for (auto& [pid, list] : m_evaluations) {
            auto it = std::remove_if(list.begin(), list.end(), [id](const Evaluation& ev) {
                return ev.id == id;
            });
            if (it != list.end()) {
                list.erase(it, list.end());
                return true;
            }
        }
        return false;
    }

    // --- Agendamentos ---
    bool add_appointment(const Appointment& a) override {
        Appointment new_a = a;
        new_a.id = m_next_appt_id++;
        m_appointments.push_back(new_a);
        return true;
    }

    std::vector<Appointment> get_appointments(const std::string& date) override {
        std::vector<Appointment> results;
        for (const auto& a : m_appointments) {
            if (a.appointment_date == date) {
                results.push_back(a);
            }
        }
        std::sort(results.begin(), results.end(), [](const Appointment& a, const Appointment& b) {
            return a.appointment_time < b.appointment_time;
        });
        return results;
    }

    std::vector<Appointment> get_patient_appointments(int patient_id) override {
        std::vector<Appointment> results;
        for (const auto& a : m_appointments) {
            if (a.patient_id && *a.patient_id == patient_id) {
                results.push_back(a);
            }
        }
        std::sort(results.begin(), results.end(), [](const Appointment& a, const Appointment& b) {
            if (a.appointment_date != b.appointment_date) return a.appointment_date > b.appointment_date;
            return a.appointment_time > b.appointment_time;
        });
        return results;
    }

    bool update_appointment(const Appointment& a) override {
        if (!a.id) return false;
        for (auto& item : m_appointments) {
            if (item.id == a.id) {
                item = a;
                return true;
            }
        }
        return false;
    }

    bool delete_appointment(int id) override {
        auto it = std::remove_if(m_appointments.begin(), m_appointments.end(), [id](const Appointment& a) {
            return a.id == id;
        });
        if (it != m_appointments.end()) {
            m_appointments.erase(it, m_appointments.end());
            return true;
        }
        return false;
    }

    bool add_audit_log([[maybe_unused]] const std::string& action, [[maybe_unused]] int entity_id, [[maybe_unused]] const std::string& details, [[maybe_unused]] const std::string& user_info) override {
        // Mock apenas confirma sucesso
        return true;
    }

    std::vector<AuditLog> get_audit_logs([[maybe_unused]] int limit) override {
        return {}; // Mock retorna vazio
    }

    bool create_backup([[maybe_unused]] const std::string& target_path) override {
        return true; // Simula sucesso
    }

    std::optional<CloudConfig> get_cloud_config() override {
        return m_cloud_config;
    }

    bool update_cloud_config(const CloudConfig& config) override {
        m_cloud_config = config;
        return true;
    }

private:
    std::map<int, Patient> m_patients;
    std::map<int, std::vector<Evaluation>> m_evaluations;
    std::vector<Appointment> m_appointments;
    std::optional<CloudConfig> m_cloud_config;
    int m_next_patient_id;
    int m_next_eval_id;
    int m_next_appt_id;
    bool m_is_open;
};

} // namespace clinic
