#include "../include/clinic/sqlite_database.hpp"
#include <iostream>
#include <vector>

namespace clinic {

SqliteDatabase::~SqliteDatabase() {
    close();
}

bool SqliteDatabase::open(const std::string& db_path, const std::string& key) {
    if (sqlite3_open(db_path.c_str(), &m_db) != SQLITE_OK) return false;

    if (!key.empty()) {
        if (sqlite3_key(m_db, key.c_str(), static_cast<int>(key.size())) != SQLITE_OK) return false;
    }

    // Ativar chaves estrangeiras para garantir integridade e delete cascade
    sqlite3_exec(m_db, "PRAGMA foreign_keys = ON;", nullptr, nullptr, nullptr);

    char* err_msg = nullptr;
    const char* test_sql = "SELECT count(*) FROM sqlite_master;";
    if (sqlite3_exec(m_db, test_sql, nullptr, nullptr, &err_msg) != SQLITE_OK) {
        if (err_msg) sqlite3_free(err_msg);
        return false;
    }

    // --- Tabela de Pacientes (Dados Fixos) ---
    const char* sql_patients = "CREATE TABLE IF NOT EXISTS patients ("
                               "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                               "healthcare_id TEXT,"
                               "name TEXT NOT NULL,"
                               "mom_name TEXT,"
                               "birth_date TEXT,"
                               "cpf TEXT,"
                               "gender TEXT,"
                               "address TEXT,"
                               "profession TEXT);";

    // --- Tabela de Telefones (N:1 com Pacientes) ---
    const char* sql_phones = "CREATE TABLE IF NOT EXISTS patient_phones ("
                             "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                             "patient_id INTEGER NOT NULL,"
                             "phone TEXT NOT NULL,"
                             "FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE);";

    // --- Tabela de Avaliações (Dados Mutáveis por Data) ---
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

    if (sqlite3_exec(m_db, sql_patients, nullptr, nullptr, &err_msg) != SQLITE_OK ||
        sqlite3_exec(m_db, sql_phones, nullptr, nullptr, &err_msg) != SQLITE_OK ||
        sqlite3_exec(m_db, sql_evaluations, nullptr, nullptr, &err_msg) != SQLITE_OK) {
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

// --- Implementação de Pacientes ---

bool SqliteDatabase::add_patient(const Patient& p) {
    // Inicia uma transação para garantir que o paciente, seus telefones e suas avaliações iniciais sejam salvos atomicamente.
    sqlite3_exec(m_db, "BEGIN TRANSACTION;", nullptr, nullptr, nullptr);

    const char* sql = "INSERT INTO patients (healthcare_id, name, mom_name, birth_date, cpf, gender, address, profession) "
                      "VALUES (?, ?, ?, ?, ?, ?, ?, ?);";
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

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        sqlite3_exec(m_db, "ROLLBACK;", nullptr, nullptr, nullptr);
        return false;
    }
    sqlite3_finalize(stmt);

    // Obtém o ID do paciente recém-inserido
    int patient_id = static_cast<int>(sqlite3_last_insert_rowid(m_db));

    // Inserir telefones
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

    // Salva as avaliações associadas, se houver
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

    std::optional<Patient> p;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        auto get_text = [&](int col) -> std::string {
            const unsigned char* text = sqlite3_column_text(stmt, col);
            return text ? reinterpret_cast<const char*>(text) : "";
        };

        // Buscar telefones
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

        p = Patient{
            sqlite3_column_int(stmt, 0), get_text(1), get_text(2), get_text(3),
            get_text(4), get_text(5), get_text(6), get_text(7), get_text(8),
            phones,
            get_patient_evaluations(sqlite3_column_int(stmt, 0))
        };
    }
    sqlite3_finalize(stmt);
    return p;
}

std::vector<Patient> SqliteDatabase::get_all_patients() {
    std::vector<Patient> patients;
    // Query que traz o paciente e os dados da última avaliação (se existir)
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
        p.phone = {};
        
        // Se houver data de avaliação, adiciona uma avaliação parcial no vetor para o frontend
        std::string last_date = get_text(9);
        if (!last_date.empty()) {
            Evaluation last_eval;
            last_eval.evaluation_date = last_date;
            last_eval.medical_diagnosis = get_text(10);
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
        p.phone = {};

        std::string last_date = get_text(9);
        if (!last_date.empty()) {
            Evaluation last_eval;
            last_eval.evaluation_date = last_date;
            last_eval.medical_diagnosis = get_text(10);
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

    const char* sql = "UPDATE patients SET healthcare_id=?, name=?, mom_name=?, birth_date=?, cpf=?, gender=?, address=?, profession=? WHERE id=?;";
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
    sqlite3_bind_int(stmt, 9, *p.id);

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        sqlite3_finalize(stmt);
        sqlite3_exec(m_db, "ROLLBACK;", nullptr, nullptr, nullptr);
        return false;
    }
    sqlite3_finalize(stmt);

    // Atualizar telefones (deletar antigos e inserir novos)
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

// --- Implementação de Avaliações ---

bool SqliteDatabase::add_evaluation(const Evaluation& e) {
    const char* sql = "INSERT INTO evaluations (patient_id, evaluation_date, doctor, medical_diagnosis, chief_complaint, "
                      "history_present_illness, past_medical_history, medications, habits_activities, physical_exam, treatment_plan) "
                      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;

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

    bool success = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    return success;
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
    const char* sql = "UPDATE evaluations SET evaluation_date=?, doctor=?, medical_diagnosis=?, chief_complaint=?, "
                      "history_present_illness=?, past_medical_history=?, medications=?, habits_activities=?, physical_exam=?, treatment_plan=? "
                      "WHERE id=?;";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;

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

    bool success = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    return success;
}

bool SqliteDatabase::delete_evaluation(int id) {
    const char* sql = "DELETE FROM evaluations WHERE id = ?;";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(m_db, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;
    sqlite3_bind_int(stmt, 1, id);
    bool success = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    return success;
}

} // namespace clinic
