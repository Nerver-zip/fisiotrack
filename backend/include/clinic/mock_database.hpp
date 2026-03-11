#pragma once

#include "database_interface.hpp"
#include <map>
#include <algorithm>

namespace clinic {

/**
 * @brief Banco de dados em memória (Mock) para testes unitários rápidos.
 * Simula as operações de banco sem tocar no disco ou usar criptografia.
 */
class MockDatabase : public IDatabase {
public:
    MockDatabase() : m_next_id(1) {}
    ~MockDatabase() override = default;

    bool open(const std::string&, const std::string&) override { return true; }
    void close() override { m_patients.clear(); }

    bool add_patient(const Patient& p) override {
        Patient new_p = p;
        new_p.id = m_next_id++;
        m_patients[new_p.id.value()] = new_p;
        return true;
    }

    std::optional<Patient> get_patient(int id) override {
        if (m_patients.find(id) != m_patients.end()) {
            return m_patients[id];
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
        return m_patients.erase(id) > 0;
    }

private:
    std::map<int, Patient> m_patients;
    int m_next_id;
};

} // namespace clinic
