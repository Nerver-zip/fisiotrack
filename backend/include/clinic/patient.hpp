#pragma once

#include <string>
#include <optional>

namespace clinic {

/**
 * @brief Representa um paciente e sua ficha de avaliação fisioterapêutica.
 */
struct Patient {
    std::optional<int> id;
    std::string name;
    int age;
    std::string cpf;
    std::string birth_date;
    std::string evaluation_date;
    std::string gender;
    std::string address;
    std::string profession;
    std::string phone;
    std::string doctor;
    std::string medical_diagnosis;
    std::string chief_complaint;
    std::string history_present_illness;
    std::string past_medical_history;
    std::string medications;
    std::string habits_activities;
    std::string physical_exam;
    std::string treatment_plan;

    // Comparador para facilitar testes
    bool operator==(const Patient& other) const {
        return id == other.id &&
               name == other.name &&
               age == other.age &&
               cpf == other.cpf &&
               birth_date == other.birth_date &&
               evaluation_date == other.evaluation_date &&
               gender == other.gender &&
               address == other.address &&
               profession == other.profession &&
               phone == other.phone &&
               doctor == other.doctor &&
               medical_diagnosis == other.medical_diagnosis &&
               chief_complaint == other.chief_complaint &&
               history_present_illness == other.history_present_illness &&
               past_medical_history == other.past_medical_history &&
               medications == other.medications &&
               habits_activities == other.habits_activities &&
               physical_exam == other.physical_exam &&
               treatment_plan == other.treatment_plan;
    }
};

} // namespace clinic
