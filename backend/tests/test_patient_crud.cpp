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
        Patient p;
        p.healthcare_id = "0004100020040013423002";
        p.name = name;
        p.mom_name = "Maria Ferreira";
        p.birth_date = "1994-01-01";
        p.cpf = "123.456.789-00";
        p.gender = "Masculino";
        p.address = "Rua Central, 100";
        p.profession = "Engenheiro";
        p.phone = {"11988887777", "11977776666"};

        Evaluation e;
        e.evaluation_date = "2024-03-11";
        e.age = 30;
        e.doctor = "Dr. Smith";
        e.medical_diagnosis = "Cervicalgia";
        e.chief_complaint = "Dor no pescoço";
        e.history_present_illness = "Piorou há 2 dias";
        e.past_medical_history = "Hipertensão";
        e.medications = "Losartana";
        e.habits_activities = "Sedentário";
        e.physical_exam = "Limitação de ADM em C3-C5";
        e.treatment_plan = "Liberação miofascial e exercícios";
        
        p.evaluations.push_back(e);
        return p;
    }

    std::string db_path;
    std::unique_ptr<PatientRepository> repo;
};

TEST_F(PatientCRUDTest, CanAddAndRetrieveFullPatientInfo) {
    Patient p = create_sample_patient("João Silva");
    
    ASSERT_TRUE(repo->add_patient(p));
    
    auto patients = repo->get_all_patients();
    ASSERT_EQ(patients.size(), 1);
    
    auto retrieved_opt = repo->get_patient(*patients[0].id);
    ASSERT_TRUE(retrieved_opt.has_value());
    Patient retrieved = *retrieved_opt;

    EXPECT_EQ(retrieved.healthcare_id, p.healthcare_id);
    EXPECT_EQ(retrieved.name, p.name);
    EXPECT_EQ(retrieved.mom_name, p.mom_name);
    EXPECT_EQ(retrieved.cpf, p.cpf);
    ASSERT_EQ(retrieved.phone.size(), 2);
    EXPECT_EQ(retrieved.phone[0], "11988887777");

    ASSERT_EQ(retrieved.evaluations.size(), 1);
    EXPECT_EQ(retrieved.evaluations[0].medical_diagnosis, p.evaluations[0].medical_diagnosis);
    EXPECT_EQ(retrieved.evaluations[0].treatment_plan, p.evaluations[0].treatment_plan);
    EXPECT_EQ(retrieved.evaluations[0].age, 30);
}

TEST_F(PatientCRUDTest, CanUpdateAllFields) {
    repo->add_patient(create_sample_patient("Original"));
    auto all = repo->get_all_patients();
    Patient p = all[0];
    
    p.name = "Updated Name";
    p.phone = {"11999998888"};
    
    ASSERT_TRUE(repo->update_patient(p));
    
    auto updated = repo->get_patient(*p.id);
    ASSERT_TRUE(updated.has_value());
    EXPECT_EQ(updated->name, "Updated Name");
    ASSERT_EQ(updated->phone.size(), 1);
    EXPECT_EQ(updated->phone[0], "11999998888");
}

TEST_F(PatientCRUDTest, HandleEmptyFields) {
    Patient p;
    p.name = "Minimal";
    ASSERT_TRUE(repo->add_patient(p));
    
    auto all = repo->get_all_patients();
    ASSERT_FALSE(all.empty());
    EXPECT_EQ(all[0].name, "Minimal");
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
