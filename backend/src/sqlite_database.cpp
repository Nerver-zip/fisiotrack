#include "../include/clinic/sqlite_database.hpp"
#include <iostream>
#include <vector>

namespace clinic {

SqliteDatabase::~SqliteDatabase() {
    close();
}
bool SqliteDatabase::is_open() const {
    return m_db != nullptr;
}

bool SqliteDatabase::open(const std::string& db_path, const std::string& key) {
    if (sqlite3_open(db_path.c_str(), &m_db) != SQLITE_OK) return false;

    if (!key.empty()) {
        if (sqlite3_key(m_db, key.c_str(), static_cast<int>(key.size())) != SQLITE_OK) {
            close();
            return false;
        }
    }

    // Ativar chaves estrangeiras para garantir integridade e delete cascade
    sqlite3_exec(m_db, "PRAGMA foreign_keys = ON;", nullptr, nullptr, nullptr);

    // TESTE DE CHAVE: Tentar ler algo do banco para ver se a senha bate.
    char* err_msg = nullptr;
    const char* test_sql = "SELECT count(*) FROM sqlite_master;";
    if (sqlite3_exec(m_db, test_sql, nullptr, nullptr, &err_msg) != SQLITE_OK) {
        if (err_msg) sqlite3_free(err_msg);
        close(); // Senha incorreta ou arquivo corrompido
        return false;
    }

    const char* sql_patients = "CREATE TABLE IF NOT EXISTS patients ("
                               "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                               "healthcare_id TEXT,"
                               "name TEXT NOT NULL,"
                               "mom_name TEXT,"
                               "birth_date TEXT,"
                               "cpf TEXT,"
                               "gender TEXT,"
                               "address TEXT,"
                               "profession TEXT,"
                               "is_favorite INTEGER DEFAULT 0,"
                               "updated_at TEXT DEFAULT (datetime('now')));";

    const char* sql_phones = "CREATE TABLE IF NOT EXISTS patient_phones ("
                             "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                             "patient_id INTEGER NOT NULL,"
                             "phone TEXT NOT NULL,"
                             "FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE);";

    const char* sql_evaluations = "CREATE TABLE IF NOT EXISTS evaluations ("
                                  "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                                  "patient_id INTEGER NOT NULL,"
                                  "evaluation_date TEXT NOT NULL,"
                                  "doctor TEXT,"
                                  "medical_diagnosis TEXT,"
                                  "chief_complaint TEXT,"
                                  "history_present_illness TEXT,"
                                  "past_medical_history TEXT,"
                                  "medications TEXT,"
                                  "habits_activities TEXT,"
                                  "physical_exam TEXT,"
                                  "treatment_plan TEXT,"
                                  "FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE);";

    const char* sql_audit = "CREATE TABLE IF NOT EXISTS audit_logs ("
                            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                            "timestamp TEXT DEFAULT (datetime('now')),"
                            "action TEXT NOT NULL,"
                            "entity_id INTEGER,"
                            "details TEXT,"
                            "user_info TEXT);";

    if (sqlite3_exec(m_db, sql_patients, nullptr, nullptr, &err_msg) != SQLITE_OK ||
        sqlite3_exec(m_db, sql_phones, nullptr, nullptr, &err_msg) != SQLITE_OK ||
        sqlite3_exec(m_db, sql_evaluations, nullptr, nullptr, &err_msg) != SQLITE_OK ||
        sqlite3_exec(m_db, sql_audit, nullptr, nullptr, &err_msg) != SQLITE_OK) {
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
    sqlite3_exec(m_db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);

    const char* sql = "INSERT INTO patients (healthcare_id, name, mom_name, birth_date, cpf, gender, address, profession, is_favorite, updated_at) "
                      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        sqlite3_exec(m_db, "ROLLBACK;", nullptr, nullptr, nullptr);
        return false;
    }

    sqlite3_bind_text(stmt, 1, p.healthcare_id.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, p.name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, p.mom_name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, p.birth_date.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, p.cpf.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, p.gender.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 7, p.address.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 8, p.profession.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 9, p.is_favorite ? 1 : 0);

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        sqlite3_exec(m_db, "ROLLBACK;", nullptr, nullptr, nullptr);
        return false;
    }
    sqlite3_finalize(stmt);

    int patient_id = static_cast<int>(sqlite3_last_insert_rowid(m_db));

    const char* sql_phone = "INSERT INTO patient_phones (patient_id, phone) VALUES (?, ?);";
    for (const auto& phone : p.phone) {
        sqlite3_stmt* p_stmt;
        if (sqlite3_prepare_v2(m_db, sql_phone, -1, &p_stmt, nullptr) == SQLITE_OK) {
            sqlite3_bind_int(p_stmt, 1, patient_id);
            sqlite3_bind_text(p_stmt, 2, phone.c_str(), -1, SQLITE_TRANSIENT);
            if (sqlite3_step(p_stmt) != SQLITE_DONE) {
                sqlite3_finalize(p_stmt);
                sqlite3_exec(m_db, "ROLLBACK;", nullptr, nullptr, nullptr);
                return false;
            }
            sqlite3_finalize(p_stmt);
        } else {
            sqlite3_exec(m_db, "ROLLBACK;", nullptr, nullptr, nullptr);
            return false;
        }
    }

    for (const auto& eval : p.evaluations) {
        Evaluation e = eval;
        e.patient_id = patient_id;
        if (!add_evaluation(e)) {
            sqlite3_exec(m_db, "ROLLBACK;", nullptr, nullptr, nullptr);
            return false;
        }
    }

    sqlite3_exec(m_db, "COMMIT;", nullptr, nullptr, nullptr);
    return true;
}

std::optional<Patient> SqliteDatabase::get_patient(int id) {
    const char* sql = "SELECT * FROM patients WHERE id = ?;";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return std::nullopt;
    sqlite3_bind_int(stmt, 1, id);

    if (sqlite3_step(stmt) == SQLITE_ROW) {
        auto get_text = [&](int col) -> std::string {
            const unsigned char* text = sqlite3_column_text(stmt, col);
            return text ? reinterpret_cast<const char*>(text) : "";
        };

        std::vector<std::string> phones;
        const char* sql_phones = "SELECT phone FROM patient_phones WHERE patient_id = ?;";
        sqlite3_stmt* p_stmt;
        if (sqlite3_prepare_v2(m_db, sql_phones, -1, &p_stmt, nullptr) == SQLITE_OK) {
            sqlite3_bind_int(p_stmt, 1, id);
            while (sqlite3_step(p_stmt) == SQLITE_ROW) {
                const unsigned char* text = sqlite3_column_text(p_stmt, 0);
                if (text) phones.push_back(reinterpret_cast<const char*>(text));
            }
            sqlite3_finalize(p_stmt);
        }

        Patient p = {
            sqlite3_column_int(stmt, 0), get_text(1), get_text(2), get_text(3),
            get_text(4), get_text(5), get_text(6), get_text(7), get_text(8),
            phones, 
            sqlite3_column_int(stmt, 9) != 0, // is_favorite
            get_text(10), // updated_at
            get_patient_evaluations(sqlite3_column_int(stmt, 0))
        };
        sqlite3_finalize(stmt);
        return p;
    }
    sqlite3_finalize(stmt);
    return std::nullopt;
}

std::vector<Patient> SqliteDatabase::get_all_patients() {
    std::vector<Patient> patients;
    const char* sql = "SELECT p.*, e.evaluation_date, e.medical_diagnosis "
                      "FROM patients p "
                      "LEFT JOIN ( "
                      "    SELECT patient_id, evaluation_date, medical_diagnosis, "
                      "           ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY evaluation_date DESC) as rn "
                      "    FROM evaluations "
                      ") e ON p.id = e.patient_id AND e.rn = 1;";

    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return patients;

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        auto get_text = [&](int col) -> std::string {
            const unsigned char* text = sqlite3_column_text(stmt, col);
            return text ? reinterpret_cast<const char*>(text) : "";
        };

        Patient p;
        p.id = sqlite3_column_int(stmt, 0);
        p.healthcare_id = get_text(1);
        p.name = get_text(2);
        p.mom_name = get_text(3);
        p.birth_date = get_text(4);
        p.cpf = get_text(5);
        p.gender = get_text(6);
        p.address = get_text(7);
        p.profession = get_text(8);
        p.is_favorite = sqlite3_column_int(stmt, 9) != 0;
        p.updated_at = get_text(10);

        std::string last_date = get_text(11);
        if (!last_date.empty()) {
            Evaluation last_eval;
            last_eval.evaluation_date = last_date;
            last_eval.medical_diagnosis = get_text(12);
            p.evaluations.push_back(last_eval);
        }
        patients.push_back(p);
    }
    sqlite3_finalize(stmt);
    return patients;
}

std::vector<Patient> SqliteDatabase::search_patients(const std::string& query) {
    std::vector<Patient> patients;
    const char* sql = "SELECT p.*, e.evaluation_date, e.medical_diagnosis "
                      "FROM patients p "
                      "LEFT JOIN ( "
                      "    SELECT patient_id, evaluation_date, medical_diagnosis, "
                      "           ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY evaluation_date DESC) as rn "
                      "    FROM evaluations "
                      ") e ON p.id = e.patient_id AND e.rn = 1 "
                      "WHERE p.name LIKE ?;";

    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return patients;

    std::string wild_query = "%" + query + "%";
    sqlite3_bind_text(stmt, 1, wild_query.c_str(), -1, SQLITE_TRANSIENT);

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        auto get_text = [&](int col) -> std::string {
            const unsigned char* text = sqlite3_column_text(stmt, col);
            return text ? reinterpret_cast<const char*>(text) : "";
        };

        Patient p;
        p.id = sqlite3_column_int(stmt, 0);
        p.healthcare_id = get_text(1);
        p.name = get_text(2);
        p.mom_name = get_text(3);
        p.birth_date = get_text(4);
        p.cpf = get_text(5);
        p.gender = get_text(6);
        p.address = get_text(7);
        p.profession = get_text(8);
        p.is_favorite = sqlite3_column_int(stmt, 9) != 0;
        p.updated_at = get_text(10);

        std::string last_date = get_text(11);
        if (!last_date.empty()) {
            Evaluation last_eval;
            last_eval.evaluation_date = last_date;
            last_eval.medical_diagnosis = get_text(12);
            p.evaluations.push_back(last_eval);
        }
        patients.push_back(p);
    }
    sqlite3_finalize(stmt);
    return patients;
}

bool SqliteDatabase::update_patient(const Patient& p) {
    if (!p.id) return false;
    sqlite3_exec(m_db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);

    const char* sql = "UPDATE patients SET healthcare_id=?, name=?, mom_name=?, birth_date=?, cpf=?, gender=?, address=?, profession=?, is_favorite=?, updated_at=datetime('now') WHERE id=?;";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        sqlite3_exec(m_db, "ROLLBACK;", nullptr, nullptr, nullptr);
        return false;
    }

    sqlite3_bind_text(stmt, 1, p.healthcare_id.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, p.name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, p.mom_name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, p.birth_date.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, p.cpf.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, p.gender.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 7, p.address.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 8, p.profession.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 9, p.is_favorite ? 1 : 0);
    sqlite3_bind_int(stmt, 10, *p.id);

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        sqlite3_exec(m_db, "ROLLBACK;", nullptr, nullptr, nullptr);
        return false;
    }
    sqlite3_finalize(stmt);

    const char* sql_del_phones = "DELETE FROM patient_phones WHERE patient_id = ?;";
    sqlite3_stmt* d_stmt;
    if (sqlite3_prepare_v2(m_db, sql_del_phones, -1, &d_stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(d_stmt, 1, *p.id);
        sqlite3_step(d_stmt);
        sqlite3_finalize(d_stmt);
    }

    const char* sql_ins_phone = "INSERT INTO patient_phones (patient_id, phone) VALUES (?, ?);";
    for (const auto& phone : p.phone) {
        sqlite3_stmt* i_stmt;
        if (sqlite3_prepare_v2(m_db, sql_ins_phone, -1, &i_stmt, nullptr) == SQLITE_OK) {
            sqlite3_bind_int(i_stmt, 1, *p.id);
            sqlite3_bind_text(i_stmt, 2, phone.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_step(i_stmt);
            sqlite3_finalize(i_stmt);
        }
    }

    sqlite3_exec(m_db, "COMMIT;", nullptr, nullptr, nullptr);
    return true;
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

bool SqliteDatabase::add_evaluation(const Evaluation& e) {
    sqlite3_exec(m_db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);

    const char* sql = "INSERT INTO evaluations (patient_id, evaluation_date, doctor, medical_diagnosis, chief_complaint, "
                      "history_present_illness, past_medical_history, medications, habits_activities, physical_exam, treatment_plan) "
                      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        sqlite3_exec(m_db, "ROLLBACK;", nullptr, nullptr, nullptr);
        return false;
    }

    sqlite3_bind_int(stmt, 1, e.patient_id);
    sqlite3_bind_text(stmt, 2, e.evaluation_date.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, e.doctor.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, e.medical_diagnosis.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, e.chief_complaint.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, e.history_present_illness.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 7, e.past_medical_history.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 8, e.medications.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 9, e.habits_activities.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 10, e.physical_exam.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 11, e.treatment_plan.c_str(), -1, SQLITE_TRANSIENT);

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        sqlite3_exec(m_db, "ROLLBACK;", nullptr, nullptr, nullptr);
        return false;
    }
    sqlite3_finalize(stmt);

    // Update patient updated_at
    const char* sql_upd_patient = "UPDATE patients SET updated_at=datetime('now') WHERE id=?;";
    sqlite3_stmt* u_stmt;
    if (sqlite3_prepare_v2(m_db, sql_upd_patient, -1, &u_stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(u_stmt, 1, e.patient_id);
        sqlite3_step(u_stmt);
        sqlite3_finalize(u_stmt);
    }

    sqlite3_exec(m_db, "COMMIT;", nullptr, nullptr, nullptr);
    return true;
}

std::vector<Evaluation> SqliteDatabase::get_patient_evaluations(int patient_id) {
    std::vector<Evaluation> evaluations;
    const char* sql = "SELECT * FROM evaluations WHERE patient_id = ? ORDER BY evaluation_date DESC;";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return evaluations;
    sqlite3_bind_int(stmt, 1, patient_id);

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        auto get_text = [&](int col) -> std::string {
            const unsigned char* text = sqlite3_column_text(stmt, col);
            return text ? reinterpret_cast<const char*>(text) : "";
        };
        evaluations.push_back(Evaluation{
            sqlite3_column_int(stmt, 0), sqlite3_column_int(stmt, 1),
            get_text(2), get_text(3), get_text(4), get_text(5),
            get_text(6), get_text(7), get_text(8), get_text(9), get_text(10), get_text(11)
        });
    }
    sqlite3_finalize(stmt);
    return evaluations;
}

bool SqliteDatabase::update_evaluation(const Evaluation& e) {
    if (!e.id) return false;
    sqlite3_exec(m_db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);

    const char* sql = "UPDATE evaluations SET evaluation_date=?, doctor=?, medical_diagnosis=?, chief_complaint=?, "
                      "history_present_illness=?, past_medical_history=?, medications=?, habits_activities=?, physical_exam=?, treatment_plan=? "
                      "WHERE id=?;";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        sqlite3_exec(m_db, "ROLLBACK;", nullptr, nullptr, nullptr);
        return false;
    }

    sqlite3_bind_text(stmt, 1, e.evaluation_date.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, e.doctor.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, e.medical_diagnosis.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, e.chief_complaint.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, e.history_present_illness.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, e.past_medical_history.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 7, e.medications.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 8, e.habits_activities.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 9, e.physical_exam.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 10, e.treatment_plan.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 11, *e.id);

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        sqlite3_exec(m_db, "ROLLBACK;", nullptr, nullptr, nullptr);
        return false;
    }
    sqlite3_finalize(stmt);

    // Update patient updated_at
    const char* sql_upd_patient = "UPDATE patients SET updated_at=datetime('now') WHERE id=?;";
    sqlite3_stmt* u_stmt;
    if (sqlite3_prepare_v2(m_db, sql_upd_patient, -1, &u_stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(u_stmt, 1, e.patient_id);
        sqlite3_step(u_stmt);
        sqlite3_finalize(u_stmt);
    }

    sqlite3_exec(m_db, "COMMIT;", nullptr, nullptr, nullptr);
    return true;
}

bool SqliteDatabase::delete_evaluation(int id) {
    // We need the patient_id to update updated_at
    int patient_id = -1;
    const char* sql_get_pid = "SELECT patient_id FROM evaluations WHERE id = ?;";
    sqlite3_stmt* g_stmt;
    if (sqlite3_prepare_v2(m_db, sql_get_pid, -1, &g_stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int(g_stmt, 1, id);
        if (sqlite3_step(g_stmt) == SQLITE_ROW) {
            patient_id = sqlite3_column_int(g_stmt, 0);
        }
        sqlite3_finalize(g_stmt);
    }

    sqlite3_exec(m_db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);

    const char* sql = "DELETE FROM evaluations WHERE id = ?;";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        sqlite3_exec(m_db, "ROLLBACK;", nullptr, nullptr, nullptr);
        return false;
    }
    sqlite3_bind_int(stmt, 1, id);
    bool success = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);

    if (success && patient_id != -1) {
        const char* sql_upd_patient = "UPDATE patients SET updated_at=datetime('now') WHERE id=?;";
        sqlite3_stmt* u_stmt;
        if (sqlite3_prepare_v2(m_db, sql_upd_patient, -1, &u_stmt, nullptr) == SQLITE_OK) {
            sqlite3_bind_int(u_stmt, 1, patient_id);
            sqlite3_step(u_stmt);
            sqlite3_finalize(u_stmt);
        }
    }

    sqlite3_exec(m_db, "COMMIT;", nullptr, nullptr, nullptr);
    return success;
}

bool SqliteDatabase::add_audit_log(const std::string& action, int entity_id, const std::string& details, const std::string& user_info) {
    const char* sql = "INSERT INTO audit_logs (action, entity_id, details, user_info) VALUES (?, ?, ?, ?);";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;

    sqlite3_bind_text(stmt, 1, action.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, entity_id);
    sqlite3_bind_text(stmt, 3, details.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, user_info.c_str(), -1, SQLITE_TRANSIENT);

    bool success = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    return success;
}

std::vector<AuditLog> SqliteDatabase::get_audit_logs(int limit) {
    std::vector<AuditLog> logs;
    const char* sql = "SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?;";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return logs;

    sqlite3_bind_int(stmt, 1, limit);

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        auto get_text = [&](int col) -> std::string {
            const unsigned char* text = sqlite3_column_text(stmt, col);
            return text ? reinterpret_cast<const char*>(text) : "";
        };

        logs.push_back(AuditLog{
            sqlite3_column_int(stmt, 0), // id
            get_text(1),                 // timestamp
            get_text(2),                 // action
            sqlite3_column_int(stmt, 3), // entity_id
            get_text(4),                 // details
            get_text(5)                  // user_info
        });
    }
    sqlite3_finalize(stmt);
    return logs;
}

bool SqliteDatabase::create_backup(const std::string& target_path) {
    if (!m_db) return false;

    // Remove arquivo se já existir para o VACUUM INTO funcionar
    if (std::filesystem::exists(target_path)) {
        std::filesystem::remove(target_path);
    }

    // VACUUM INTO cria uma cópia consistente e compactada do banco atual
    std::string sql = "VACUUM INTO '" + target_path + "';";
    char* err_msg = nullptr;
    if (sqlite3_exec(m_db, sql.c_str(), nullptr, nullptr, &err_msg) != SQLITE_OK) {
        if (err_msg) {
            std::cerr << "Erro no backup: " << err_msg << std::endl;
            sqlite3_free(err_msg);
        }
        return false;
    }
    return true;
}

} // namespace clinic
