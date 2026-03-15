#include <gtest/gtest.h>
#include "../include/clinic/sqlite_database.hpp"
#include "../include/clinic/patient_repository.hpp"
#include <filesystem>
#include <memory>

namespace clinic {

class PatientCRUDTest : public ::testing::Test {
protected:
    void SetUp() override {
        db_path = "test_clinic.db";
        std::filesystem::remove(db_path);
        
        auto db = std::make_unique<SqliteDatabase>();
        repo = std::make_unique<PatientRepository>(std::move(db));
        ASSERT_TRUE(repo->initialize(db_path, "master_password"));
    }

    void TearDown() override {
        repo.reset();
        std::filesystem::remove(db_path);
    }

    Patient create_sample_patient(const std::string& name) {
        return Patient{
            std::nullopt,
            "0004100020040013423002",
            name,
            "Maria Ferreira",
            30,
            "123.456.789-00",
            "1994-01-01",
            "2024-03-11",
            "Masculino",
            "Rua Central, 100",
            "Engenheiro",
            "11988887777",
            "Dr. Smith",
            "Cervicalgia",
            "Dor no pescoço",
            "Piorou há 2 dias",
            "Hipertensão",
            "Losartana",
            "Sedentário",
            "Limitação de ADM em C3-C5",
            "Liberação miofascial e exercícios"
        };
    }

    std::string db_path;
    std::unique_ptr<PatientRepository> repo;
};

TEST_F(PatientCRUDTest, CanAddAndRetrieveFullPatientInfo) {
    Patient p = create_sample_patient("João Silva");
    
    ASSERT_TRUE(repo->add_patient(p));
    
    auto patients = repo->get_all_patients();
    ASSERT_EQ(patients.size(), 1);
    
    Patient retrieved = patients[0];
    EXPECT_EQ(retrieved.healthcare_id, p.healthcare_id);
    EXPECT_EQ(retrieved.name, p.name);
    EXPECT_EQ(retrieved.mom_name, p.mom_name);
    EXPECT_EQ(retrieved.age, p.age);
    EXPECT_EQ(retrieved.cpf, p.cpf);
    EXPECT_EQ(retrieved.medical_diagnosis, p.medical_diagnosis);
    EXPECT_EQ(retrieved.treatment_plan, p.treatment_plan);
}

TEST_F(PatientCRUDTest, CanUpdateAllFields) {
    repo->add_patient(create_sample_patient("Original"));
    auto all = repo->get_all_patients();
    Patient p = all[0];
    
    p.name = "Updated Name";
    p.age = 45;
    p.doctor = "Dr. House";
    p.medications = "Nenhuma";
    
    ASSERT_TRUE(repo->update_patient(p));
    
    auto updated = repo->get_patient(*p.id);
    ASSERT_TRUE(updated.has_value());
    EXPECT_EQ(updated->name, "Updated Name");
    EXPECT_EQ(updated->age, 45);
    EXPECT_EQ(updated->doctor, "Dr. House");
    EXPECT_EQ(updated->medications, "Nenhuma");
}

TEST_F(PatientCRUDTest, HandleEmptyFields) {
    Patient p{std::nullopt, "", "Minimal", "", 0, "", "", "", "", "", "", "", "", "", "", "", "", "", ""};
    ASSERT_TRUE(repo->add_patient(p));
    
    auto all = repo->get_all_patients();
    ASSERT_FALSE(all.empty());
    EXPECT_EQ(all[0].name, "Minimal");
    EXPECT_EQ(all[0].cpf, "");
}

TEST_F(PatientCRUDTest, DeleteRemovesFromDatabase) {
    repo->add_patient(create_sample_patient("To Delete"));
    auto all = repo->get_all_patients();
    int id = *all[0].id;
    
    ASSERT_TRUE(repo->delete_patient(id));
    EXPECT_FALSE(repo->get_patient(id).has_value());
    EXPECT_TRUE(repo->get_all_patients().empty());
}

TEST_F(PatientCRUDTest, CanOpenCiphered) {
    const std::string db_test = "cipher_open_test.db";
    const std::string correct_pass = "mypassword";
    std::filesystem::remove(db_test);

    // Cria e fecha um banco criptografado
    {
        auto db = std::make_unique<SqliteDatabase>();
        ASSERT_TRUE(db->open(db_test, correct_pass));
        Patient p = create_sample_patient("Encrypted Patient");
        ASSERT_TRUE(db->add_patient(p));
        db->close();
    }

    // Reabre com a senha correta
    {
        auto db = std::make_unique<SqliteDatabase>();
        ASSERT_TRUE(db->open(db_test, correct_pass));
        auto all = db->get_all_patients();
        ASSERT_EQ(all.size(), 1);
        EXPECT_EQ(all[0].name, "Encrypted Patient");
    }

    std::filesystem::remove(db_test);
}

TEST_F(PatientCRUDTest, CanSearchPatientsByName) {
    repo->add_patient(create_sample_patient("Alice Smith"));
    repo->add_patient(create_sample_patient("Bob Jones"));
    repo->add_patient(create_sample_patient("Charlie Smith"));

    auto smiths = repo->search_patients("Smith");
    EXPECT_EQ(smiths.size(), 2);

    auto bob = repo->search_patients("Bob");
    ASSERT_EQ(bob.size(), 1);
    EXPECT_EQ(bob[0].name, "Bob Jones");

    auto none = repo->search_patients("Xyz");
    EXPECT_TRUE(none.empty());
}

TEST_F(PatientCRUDTest, PersistenceBetweenSessions) {
    const std::string db_encrypted = "persist_encrypted.db";
    const std::string test_pass = "secure_password";
    std::filesystem::remove(db_encrypted);
    
    // Insere dados em uma sessão criptografada
    {
        auto database1 = std::make_unique<SqliteDatabase>();
        PatientRepository repo1(std::move(database1));
        ASSERT_TRUE(repo1.initialize(db_encrypted, test_pass));
        repo1.add_patient(create_sample_patient("PersistCryptoTest"));
    }
    
    // Tenta ler em outra sessão com a mesma chave
    {
        auto database2 = std::make_unique<SqliteDatabase>();
        PatientRepository repo2(std::move(database2));
        ASSERT_TRUE(repo2.initialize(db_encrypted, test_pass));
        auto all = repo2.get_all_patients();
        ASSERT_EQ(all.size(), 1);
        EXPECT_EQ(all[0].name, "PersistCryptoTest");
    }
    
    // Tenta ler com a chave ERRADA (deve falhar a inicialização ou a leitura)
    {
        auto database3 = std::make_unique<SqliteDatabase>();
        PatientRepository repo3(std::move(database3));
        // A inicialização deve falhar devido ao cheque de autenticação que inserimos no open()
        EXPECT_FALSE(repo3.initialize(db_encrypted, "wrong_password"));
    }

    std::filesystem::remove(db_encrypted);
}

TEST_F(PatientCRUDTest, RejectUpdateWithoutId) {
    Patient p = create_sample_patient("No ID");
    EXPECT_FALSE(repo->update_patient(p));
}

} // namespace clinic
