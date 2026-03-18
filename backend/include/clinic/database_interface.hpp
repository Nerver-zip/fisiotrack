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
    virtual std::vector<Patient> search_patients(const std::string& query) = 0;
    virtual bool update_patient(const Patient& p) = 0;
    virtual bool delete_patient(int id) = 0;
    virtual void import_patients(const std::vector<Patient>& patients) = 0;

    // --- Avaliações (Entradas Clínicas) ---
    virtual bool add_evaluation(const Evaluation& e) = 0;
    virtual std::vector<Evaluation> get_patient_evaluations(int patient_id) = 0;
    virtual bool update_evaluation(const Evaluation& e) = 0;
    virtual bool delete_evaluation(int id) = 0;
};

} // namespace clinic
