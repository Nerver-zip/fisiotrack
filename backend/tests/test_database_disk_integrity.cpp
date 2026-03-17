#include <gtest/gtest.h>
#include "../include/clinic/sqlite_database.hpp"
#include <filesystem>
#include <fstream>
#include <string>

namespace clinic {

class DatabaseDiskTest : public ::testing::Test {
protected:
    void SetUp() override {
        test_db = "disk_test_encrypted.db";
        test_pass = "secret_key_123";
        std::filesystem::remove(test_db);
    }

    void TearDown() override {
        if (std::filesystem::exists(test_db)) {
            std::filesystem::remove(test_db);
        }
    }

    Patient create_minimal_patient(const std::string& name) {
        Patient p;
        p.name = name;
        return p;
    }

    std::string test_db;
    std::string test_pass;
};

TEST_F(DatabaseDiskTest, FileIsCreatedOnDisk) {
    SqliteDatabase db;
    ASSERT_TRUE(db.open(test_db, test_pass));
    db.close();
    
    // Verifica se o arquivo fisicamente existe no disco
    EXPECT_TRUE(std::filesystem::exists(test_db));
    EXPECT_GT(std::filesystem::file_size(test_db), 0);
}

TEST_F(DatabaseDiskTest, DataPersistsAfterClosing) {
    {
        SqliteDatabase db;
        db.open(test_db, test_pass);
        Patient p;
        p.healthcare_id = "SUS-123";
        p.name = "Paciente Persistente";
        p.mom_name = "Maria";
        p.birth_date = "1980-01-01";
        p.cpf = "123";
        p.gender = "M";
        p.address = "Endereço";
        p.profession = "Prof";
        p.phone = {"123"};
        
        Evaluation e;
        e.evaluation_date = "2024-03-11";
        e.doctor = "Dr";
        e.medical_diagnosis = "Diag";
        e.chief_complaint = "Queixa";
        e.history_present_illness = "Hist1";
        e.past_medical_history = "Hist2";
        e.medications = "Med";
        e.habits_activities = "Hab";
        e.physical_exam = "Exame";
        e.treatment_plan = "Trat";
        p.evaluations.push_back(e);

        ASSERT_TRUE(db.add_patient(p));
        db.close(); // Banco fechado e "salvo" no disco
    }

    // Reabre uma NOVA instância do banco do zero
    {
        SqliteDatabase db;
        ASSERT_TRUE(db.open(test_db, test_pass));
        auto patients = db.get_all_patients();
        ASSERT_EQ(patients.size(), 1);
        EXPECT_EQ(patients[0].name, "Paciente Persistente");
    }
}

TEST_F(DatabaseDiskTest, FileIsEncryptedAndNotPlaintext) {
    SqliteDatabase db;
    db.open(test_db, test_pass);
    Patient p;
    p.name = "NOME_MUITO_ESPECIFICO_PARA_BUSCA";
    db.add_patient(p);
    db.close();

    // Tenta ler o arquivo .db como se fosse um arquivo de texto comum
    std::ifstream file(test_db, std::ios::binary);
    std::string content((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
    
    // Se a criptografia estiver ativa, o nome do paciente NÃO deve aparecer como texto puro no arquivo
    EXPECT_EQ(content.find("NOME_MUITO_ESPECIFICO_PARA_BUSCA"), std::string::npos);
    
    // O arquivo deve conter caracteres binários (não legíveis)
    bool has_non_printable = false;
    for (char c : content) {
        if (!isprint(static_cast<unsigned char>(c)) && !isspace(static_cast<unsigned char>(c))) {
            has_non_printable = true;
            break;
        }
    }
    EXPECT_TRUE(has_non_printable);
}

TEST_F(DatabaseDiskTest, FullCRUDOnDisk) {
    const std::string name = "CRUD Disk Test";
    int id = -1;

    // 1. CREATE
    {
        SqliteDatabase db;
        db.open(test_db, test_pass);
        Patient p = create_minimal_patient(name);
        ASSERT_TRUE(db.add_patient(p));
        auto all = db.get_all_patients();
        id = *all[0].id;
        db.close();
    }

    // 2. READ & UPDATE
    {
        SqliteDatabase db;
        db.open(test_db, test_pass);
        auto p_opt = db.get_patient(id);
        ASSERT_TRUE(p_opt.has_value());
        EXPECT_EQ(p_opt->name, name);

        p_opt->name = "Updated on Disk";
        ASSERT_TRUE(db.update_patient(*p_opt));
        db.close();
    }

    // 3. VERIFY UPDATE & DELETE
    {
        SqliteDatabase db;
        db.open(test_db, test_pass);
        auto p_opt = db.get_patient(id);
        EXPECT_EQ(p_opt->name, "Updated on Disk");
        
        ASSERT_TRUE(db.delete_patient(id));
        EXPECT_FALSE(db.get_patient(id).has_value());
        db.close();
    }
}

} // namespace clinic
