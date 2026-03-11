#include "../include/clinic/sqlite_database.hpp"
#include <iostream>
#include <format>
#include <vector>

namespace clinic {

SqliteDatabase::~SqliteDatabase() {
    close();
}

bool SqliteDatabase::open(const std::string& db_path, const std::string& key) {
    if (sqlite3_open(db_path.c_str(), &m_db) != SQLITE_OK) {
        return false;
    }

    if (!key.empty()) {
        if (sqlite3_key(m_db, key.c_str(), static_cast<int>(key.size())) != SQLITE_OK) {
            return false;
        }
    }

    char* err_msg = nullptr;
    // Tenta uma operação simples para validar a chave
    const char* test_sql = "SELECT count(*) FROM sqlite_master;";
    if (sqlite3_exec(m_db, test_sql, nullptr, nullptr, &err_msg) != SQLITE_OK) {
        if (err_msg) sqlite3_free(err_msg);
        return false;
    }

    const char* sql = "CREATE TABLE IF NOT EXISTS patients ("
                      "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                      "name TEXT NOT NULL,"
                      "age INTEGER,"
                      "cpf TEXT,"
                      "birth_date TEXT,"
                      "evaluation_date TEXT,"
                      "gender TEXT,"
                      "address TEXT,"
                      "profession TEXT,"
                      "phone TEXT,"
                      "doctor TEXT,"
                      "medical_diagnosis TEXT,"
                      "chief_complaint TEXT,"
                      "history_present_illness TEXT,"
                      "past_medical_history TEXT,"
                      "medications TEXT,"
                      "habits_activities TEXT,"
                      "physical_exam TEXT,"
                      "treatment_plan TEXT);";

    if (sqlite3_exec(m_db, sql, nullptr, nullptr, &err_msg) != SQLITE_OK) {
        std::cerr << "Falha ao criar/acessar tabela: " << (err_msg ? err_msg : "Erro desconhecido") << std::endl;
        if (err_msg) sqlite3_free(err_msg);
        return false;
    }

    return true;
}

void SqliteDatabase::close() {
    if (m_db) {
        sqlite3_close(m_db);
        m_db = nullptr;
    }
}

bool SqliteDatabase::add_patient(const Patient& p) {
    const char* sql = "INSERT INTO patients (name, age, cpf, birth_date, evaluation_date, gender, address, profession, phone, "
                      "doctor, medical_diagnosis, chief_complaint, history_present_illness, past_medical_history, "
                      "medications, habits_activities, physical_exam, treatment_plan) "
                      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";
    
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;

    sqlite3_bind_text(stmt, 1, p.name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, p.age);
    sqlite3_bind_text(stmt, 3, p.cpf.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, p.birth_date.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, p.evaluation_date.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, p.gender.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 7, p.address.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 8, p.profession.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 9, p.phone.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 10, p.doctor.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 11, p.medical_diagnosis.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 12, p.chief_complaint.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 13, p.history_present_illness.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 14, p.past_medical_history.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 15, p.medications.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 16, p.habits_activities.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 17, p.physical_exam.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 18, p.treatment_plan.c_str(), -1, SQLITE_TRANSIENT);

    bool success = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    return success;
}

std::optional<Patient> SqliteDatabase::get_patient(int id) {
    const char* sql = "SELECT * FROM patients WHERE id = ?;";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return std::nullopt;

    sqlite3_bind_int(stmt, 1, id);

    std::optional<Patient> p;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        auto get_text = [&](int col) -> std::string {
            const unsigned char* text = sqlite3_column_text(stmt, col);
            return text ? reinterpret_cast<const char*>(text) : "";
        };

        p = Patient{
            sqlite3_column_int(stmt, 0),
            get_text(1),
            sqlite3_column_int(stmt, 2),
            get_text(3),
            get_text(4),
            get_text(5),
            get_text(6),
            get_text(7),
            get_text(8),
            get_text(9),
            get_text(10),
            get_text(11),
            get_text(12),
            get_text(13),
            get_text(14),
            get_text(15),
            get_text(16),
            get_text(17),
            get_text(18)
        };
    }

    sqlite3_finalize(stmt);
    return p;
}

std::vector<Patient> SqliteDatabase::get_all_patients() {
    std::vector<Patient> patients;
    const char* sql = "SELECT * FROM patients;";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return patients;

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        auto get_text = [&](int col) -> std::string {
            const unsigned char* text = sqlite3_column_text(stmt, col);
            return text ? reinterpret_cast<const char*>(text) : "";
        };

        patients.push_back(Patient{
            sqlite3_column_int(stmt, 0),
            get_text(1),
            sqlite3_column_int(stmt, 2),
            get_text(3),
            get_text(4),
            get_text(5),
            get_text(6),
            get_text(7),
            get_text(8),
            get_text(9),
            get_text(10),
            get_text(11),
            get_text(12),
            get_text(13),
            get_text(14),
            get_text(15),
            get_text(16),
            get_text(17),
            get_text(18)
        });
    }

    sqlite3_finalize(stmt);
    return patients;
}

std::vector<Patient> SqliteDatabase::search_patients(const std::string& query) {
    std::vector<Patient> patients;
    const char* sql = "SELECT * FROM patients WHERE name LIKE ?;";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return patients;

    std::string wild_query = "%" + query + "%";
    sqlite3_bind_text(stmt, 1, wild_query.c_str(), -1, SQLITE_TRANSIENT);

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        auto get_text = [&](int col) -> std::string {
            const unsigned char* text = sqlite3_column_text(stmt, col);
            return text ? reinterpret_cast<const char*>(text) : "";
        };

        patients.push_back(Patient{
            sqlite3_column_int(stmt, 0),
            get_text(1),
            sqlite3_column_int(stmt, 2),
            get_text(3),
            get_text(4),
            get_text(5),
            get_text(6),
            get_text(7),
            get_text(8),
            get_text(9),
            get_text(10),
            get_text(11),
            get_text(12),
            get_text(13),
            get_text(14),
            get_text(15),
            get_text(16),
            get_text(17),
            get_text(18)
        });
    }

    sqlite3_finalize(stmt);
    return patients;
}

bool SqliteDatabase::update_patient(const Patient& p) {
    if (!p.id) return false;

    const char* sql = "UPDATE patients SET name=?, age=?, cpf=?, birth_date=?, evaluation_date=?, gender=?, address=?, "
                      "profession=?, phone=?, doctor=?, medical_diagnosis=?, chief_complaint=?, history_present_illness=?, "
                      "past_medical_history=?, medications=?, habits_activities=?, physical_exam=?, treatment_plan=? "
                      "WHERE id=?;";
    
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;

    sqlite3_bind_text(stmt, 1, p.name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, p.age);
    sqlite3_bind_text(stmt, 3, p.cpf.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, p.birth_date.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, p.evaluation_date.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, p.gender.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 7, p.address.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 8, p.profession.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 9, p.phone.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 10, p.doctor.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 11, p.medical_diagnosis.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 12, p.chief_complaint.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 13, p.history_present_illness.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 14, p.past_medical_history.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 15, p.medications.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 16, p.habits_activities.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 17, p.physical_exam.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 18, p.treatment_plan.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 19, *p.id);

    bool success = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    return success;
}

bool SqliteDatabase::delete_patient(int id) {
    const char* sql = "DELETE FROM patients WHERE id = ?;";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;

    sqlite3_bind_int(stmt, 1, id);

    bool success = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    return success;
}

} // namespace clinic
