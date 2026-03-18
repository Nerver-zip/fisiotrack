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
    EXPECT_TRUE(std::filesystem::exists(test_db));
    EXPECT_GT(std::filesystem::file_size(test_db), 0);
}

TEST_F(DatabaseDiskTest, DataPersistsAfterClosing) {
    {
        SqliteDatabase db;
        db.open(test_db, test_pass);
        Patient p;
        p.name = "Paciente Persistente";
        p.birth_date = "1980-01-01";
        ASSERT_TRUE(db.add_patient(p));
        db.close();
    }

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

    std::ifstream file(test_db, std::ios::binary);
    std::string content((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
    EXPECT_EQ(content.find("NOME_MUITO_ESPECIFICO_PARA_BUSCA"), std::string::npos);
}

TEST_F(DatabaseDiskTest, FullCRUDOnDisk) {
    const std::string name = "CRUD Disk Test";
    int id = -1;

    {
        SqliteDatabase db;
        db.open(test_db, test_pass);
        Patient p = create_minimal_patient(name);
        ASSERT_TRUE(db.add_patient(p));
        auto all = db.get_all_patients();
        id = *all[0].id;
        db.close();
    }

    {
        SqliteDatabase db;
        db.open(test_db, test_pass);
        auto p_opt = db.get_patient(id);
        ASSERT_TRUE(p_opt.has_value());
        p_opt->name = "Updated on Disk";
        ASSERT_TRUE(db.update_patient(*p_opt));
        db.close();
    }

    {
        SqliteDatabase db;
        db.open(test_db, test_pass);
        ASSERT_TRUE(db.delete_patient(id));
        db.close();
    }
}

} // namespace clinic
