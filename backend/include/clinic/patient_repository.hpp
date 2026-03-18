#pragma once

#include "database_interface.hpp"
#include "patient.hpp"
#include <memory>
#include <vector>
#include <optional>
#include <string>
#include <map>
#include <algorithm>

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

    bool authenticate(const std::string& password) {
        if (m_db_path.empty()) return false;
        return m_db->open(m_db_path, password);
    }

    bool is_authenticated() const {
        return m_db->is_open();
    }

    void logout() {
        m_db->close();
    }

    bool add_patient(const Patient& p) { return m_db->add_patient(p); }
    std::optional<Patient> get_patient(int id) { return m_db->get_patient(id); }
    std::vector<Patient> get_all_patients() { return m_db->get_all_patients(); }
    std::vector<Patient> search_patients(const std::string& query) { return m_db->search_patients(query); }
    bool update_patient(const Patient& p) { return m_db->update_patient(p); }
    bool delete_patient(int id) { return m_db->delete_patient(id); }

    void import_patients(const std::vector<Patient>& patients) {
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
                if (updated) update_patient(*db_patient);

                for (auto eval : p.evaluations) {
                    eval.patient_id = *db_patient->id;
                    add_evaluation(eval);
                }
            } else {
                add_patient(p);
            }
        }
    }

    // --- Avaliações ---
    bool add_evaluation(const Evaluation& e) { return m_db->add_evaluation(e); }
    std::vector<Evaluation> get_patient_evaluations(int patient_id) { return m_db->get_patient_evaluations(patient_id); }
    bool update_evaluation(const Evaluation& e) { return m_db->update_evaluation(e); }
    bool delete_evaluation(int id) { return m_db->delete_evaluation(id); }

private:
    std::unique_ptr<IDatabase> m_db;
    std::string m_db_path;
};

} // namespace clinic
