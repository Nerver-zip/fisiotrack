#include <gtest/gtest.h>
#include "../include/clinic/sqlite_database.hpp"
#include "../include/clinic/patient_repository.hpp"
#include <filesystem>
#include <memory>

namespace clinic {

class AppointmentTest : public ::testing::Test {
protected:
    void SetUp() override {
        db_path = "test_appointments.db";
        std::filesystem::remove(db_path);

        auto db = std::make_unique<SqliteDatabase>();
        repo = std::make_unique<PatientRepository>(std::move(db));
        ASSERT_TRUE(repo->initialize(db_path));
        ASSERT_TRUE(repo->authenticate("test_pass"));
    }

    void TearDown() override {
        repo.reset();
        std::filesystem::remove(db_path);
    }

    std::string db_path;
    std::unique_ptr<PatientRepository> repo;
};

TEST_F(AppointmentTest, CanAddAndRetrieveAppointments) {
    Appointment a1;
    a1.patient_name = "Paciente Novo";
    a1.appointment_date = "2026-03-26";
    a1.appointment_time = "14:00";
    a1.notes = "Consulta inicial";

    ASSERT_TRUE(repo->add_appointment(a1));

    auto appointments = repo->get_appointments("2026-03-26");
    ASSERT_EQ(appointments.size(), 1);
    EXPECT_EQ(appointments[0].patient_name, "Paciente Novo");
    EXPECT_EQ(appointments[0].appointment_time, "14:00");
    EXPECT_FALSE(appointments[0].patient_id.has_value());
}

TEST_F(AppointmentTest, CanLinkToExistingPatient) {
    Patient p;
    p.name = "Paciente Cadastrado";
    ASSERT_TRUE(repo->add_patient(p));
    auto patients = repo->get_all_patients();
    int pid = *patients[0].id;

    Appointment a1;
    a1.patient_id = pid;
    a1.patient_name = p.name;
    a1.appointment_date = "2026-03-26";
    a1.appointment_time = "15:00";

    ASSERT_TRUE(repo->add_appointment(a1));

    auto appointments = repo->get_appointments("2026-03-26");
    ASSERT_EQ(appointments.size(), 1);
    EXPECT_EQ(appointments[0].patient_id, pid);
    EXPECT_EQ(appointments[0].patient_name, "Paciente Cadastrado");
}

TEST_F(AppointmentTest, AppointmentsAreSortedByTime) {
    Appointment a1;
    a1.patient_name = "Tarde";
    a1.appointment_date = "2026-03-26";
    a1.appointment_time = "16:00";
    repo->add_appointment(a1);

    Appointment a2;
    a2.patient_name = "Manhã";
    a2.appointment_date = "2026-03-26";
    a2.appointment_time = "09:00";
    repo->add_appointment(a2);

    auto appointments = repo->get_appointments("2026-03-26");
    ASSERT_EQ(appointments.size(), 2);
    EXPECT_EQ(appointments[0].patient_name, "Manhã");
    EXPECT_EQ(appointments[1].patient_name, "Tarde");
}

TEST_F(AppointmentTest, CanUpdateAppointment) {
    Appointment a1;
    a1.patient_name = "Teste Update";
    a1.appointment_date = "2026-03-26";
    a1.appointment_time = "10:00";
    repo->add_appointment(a1);

    auto appts = repo->get_appointments("2026-03-26");
    Appointment to_update = appts[0];
    to_update.status = "completed";
    to_update.notes = "Finalizado";

    ASSERT_TRUE(repo->update_appointment(to_update));

    auto updated = repo->get_appointments("2026-03-26");
    EXPECT_EQ(updated[0].status, "completed");
    EXPECT_EQ(updated[0].notes, "Finalizado");
}

TEST_F(AppointmentTest, CanDeleteAppointment) {
    Appointment a1;
    a1.patient_name = "Para Deletar";
    a1.appointment_date = "2026-03-26";
    a1.appointment_time = "11:00";
    repo->add_appointment(a1);

    auto appts = repo->get_appointments("2026-03-26");
    int id = *appts[0].id;

    ASSERT_TRUE(repo->delete_appointment(id));
    EXPECT_EQ(repo->get_appointments("2026-03-26").size(), 0);
}

TEST_F(AppointmentTest, SessionCountReflectsCompletedAppointments) {
    Patient p;
    p.name = "Paciente Contador";
    repo->add_patient(p);
    auto patients = repo->get_all_patients();
    int pid = *patients[0].id;

    // Adicionar 3 agendamentos: 2 concluídos, 1 agendado
    Appointment a1; a1.patient_id = pid; a1.patient_name = p.name;
    a1.appointment_date = "2026-03-20"; a1.appointment_time = "10:00"; a1.status = "completed";
    repo->add_appointment(a1);

    a1.appointment_date = "2026-03-21"; a1.status = "completed";
    repo->add_appointment(a1);

    a1.appointment_date = "2026-03-22"; a1.status = "scheduled";
    repo->add_appointment(a1);

    // Verificar via get_patient
    auto p_detail = repo->get_patient(pid);
    ASSERT_TRUE(p_detail.has_value());
    EXPECT_EQ(p_detail->session_count, 2);

    // Verificar via get_all_patients
    auto all_p = repo->get_all_patients();
    EXPECT_EQ(all_p[0].session_count, 2);
}

TEST_F(AppointmentTest, CanRetrievePatientAppointmentHistory) {
    Patient p;
    p.name = "Paciente Historico";
    repo->add_patient(p);
    int pid = *repo->get_all_patients()[0].id;

    Appointment a1; a1.patient_id = pid; a1.patient_name = p.name;
    a1.appointment_date = "2026-03-10"; a1.appointment_time = "09:00";
    repo->add_appointment(a1);

    a1.appointment_date = "2026-03-15"; a1.appointment_time = "14:00";
    repo->add_appointment(a1);

    auto history = repo->get_patient_appointments(pid);
    ASSERT_EQ(history.size(), 2);
    // Verificando ordenação (mais recente primeiro)
    EXPECT_EQ(history[0].appointment_date, "2026-03-15");
    EXPECT_EQ(history[1].appointment_date, "2026-03-10");
}

} // namespace clinic
