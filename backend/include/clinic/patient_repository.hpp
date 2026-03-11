#pragma once

#include "database_interface.hpp"
#include "patient.hpp"
#include <memory>
#include <vector>
#include <optional>
#include <string>

namespace clinic {

/**
 * @brief Repositório para gerenciar a lógica de pacientes.
 * Atua como uma camada de abstração entre a aplicação e o banco de dados.
 */
class PatientRepository {
public:
    explicit PatientRepository(std::unique_ptr<IDatabase> db) : m_db(std::move(db)) {}

    bool initialize(const std::string& db_path, const std::string& key) {
        return m_db->open(db_path, key);
    }

    bool add_patient(const Patient& p) { return m_db->add_patient(p); }
    std::optional<Patient> get_patient(int id) { return m_db->get_patient(id); }
    std::vector<Patient> get_all_patients() { return m_db->get_all_patients(); }
    std::vector<Patient> search_patients(const std::string& query) { return m_db->search_patients(query); }
    bool update_patient(const Patient& p) { return m_db->update_patient(p); }
    bool delete_patient(int id) { return m_db->delete_patient(id); }

private:
    std::unique_ptr<IDatabase> m_db;
};

} // namespace clinic
