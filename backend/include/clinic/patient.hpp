#pragma once

#include <string>
#include <optional>
#include <nlohmann/json.hpp>

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

// Implementação manual para lidar com std::optional
inline void to_json(nlohmann::json& j, const Patient& p) {
    j = nlohmann::json{
        {"name", p.name}, {"age", p.age}, {"cpf", p.cpf},
        {"birth_date", p.birth_date}, {"evaluation_date", p.evaluation_date},
        {"gender", p.gender}, {"address", p.address}, {"profession", p.profession},
        {"phone", p.phone}, {"doctor", p.doctor}, {"medical_diagnosis", p.medical_diagnosis},
        {"chief_complaint", p.chief_complaint}, {"history_present_illness", p.history_present_illness},
        {"past_medical_history", p.past_medical_history}, {"medications", p.medications},
        {"habits_activities", p.habits_activities}, {"physical_exam", p.physical_exam},
        {"treatment_plan", p.treatment_plan}
    };
    if (p.id) j["id"] = *p.id;
}

inline void from_json(const nlohmann::json& j, Patient& p) {
    if (j.contains("id")) p.id = j.at("id").get<int>();
    j.at("name").get_to(p.name);
    j.at("age").get_to(p.age);
    j.at("cpf").get_to(p.cpf);
    j.at("birth_date").get_to(p.birth_date);
    j.at("evaluation_date").get_to(p.evaluation_date);
    j.at("gender").get_to(p.gender);
    j.at("address").get_to(p.address);
    j.at("profession").get_to(p.profession);
    j.at("phone").get_to(p.phone);
    j.at("doctor").get_to(p.doctor);
    j.at("medical_diagnosis").get_to(p.medical_diagnosis);
    j.at("chief_complaint").get_to(p.chief_complaint);
    j.at("history_present_illness").get_to(p.history_present_illness);
    j.at("past_medical_history").get_to(p.past_medical_history);
    j.at("medications").get_to(p.medications);
    j.at("habits_activities").get_to(p.habits_activities);
    j.at("physical_exam").get_to(p.physical_exam);
    j.at("treatment_plan").get_to(p.treatment_plan);
}

} // namespace clinic
