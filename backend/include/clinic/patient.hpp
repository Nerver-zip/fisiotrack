#pragma once

#include <string>
#include <optional>
#include <vector>
#include "../../build/_deps/json-src/include/nlohmann/json.hpp"

namespace clinic {

/**
 * @brief Representa uma entrada clínica (ficha de avaliação) em uma data específica.
 */
struct Evaluation {
    std::optional<int> id;
    int patient_id;
    std::string evaluation_date;
    int age;
    std::string doctor;
    std::string medical_diagnosis;
    std::string chief_complaint;
    std::string history_present_illness;
    std::string past_medical_history;
    std::string medications;
    std::string habits_activities;
    std::string physical_exam;
    std::string treatment_plan;

    bool operator==(const Evaluation& other) const {
        return id == other.id &&
               patient_id == other.patient_id &&
               evaluation_date == other.evaluation_date &&
               age == other.age &&
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

/**
 * @brief Representa os dados cadastrais (imutáveis) do paciente.
 */
struct Patient {
    std::optional<int> id;
    std::string healthcare_id;
    std::string name;
    std::string mom_name;
    std::string birth_date;
    std::string cpf;
    std::string gender;
    std::string address;
    std::string profession;
    std::vector<std::string> phone;
    
    // Histórico de avaliações
    std::vector<Evaluation> evaluations;

    bool operator==(const Patient& other) const {
        return id == other.id &&
               healthcare_id == other.healthcare_id &&
               name == other.name &&
               mom_name == other.mom_name &&
               birth_date == other.birth_date &&
               cpf == other.cpf &&
               gender == other.gender &&
               address == other.address &&
               profession == other.profession &&
               phone == other.phone;
    }
};

// --- Serialização JSON ---

inline void to_json(nlohmann::json& j, const Evaluation& e) {
    j = nlohmann::json{
        {"patient_id", e.patient_id},
        {"evaluation_date", e.evaluation_date},
        {"age", e.age},
        {"doctor", e.doctor},
        {"medical_diagnosis", e.medical_diagnosis},
        {"chief_complaint", e.chief_complaint},
        {"history_present_illness", e.history_present_illness},
        {"past_medical_history", e.past_medical_history},
        {"medications", e.medications},
        {"habits_activities", e.habits_activities},
        {"physical_exam", e.physical_exam},
        {"treatment_plan", e.treatment_plan}
    };
    if (e.id) j["id"] = *e.id;
}

inline void from_json(const nlohmann::json& j, Evaluation& e) {
    if (j.contains("id")) e.id = j.at("id").get<int>();
    j.at("patient_id").get_to(e.patient_id);
    j.at("evaluation_date").get_to(e.evaluation_date);
    j.at("age").get_to(e.age);
    j.at("doctor").get_to(e.doctor);
    j.at("medical_diagnosis").get_to(e.medical_diagnosis);
    j.at("chief_complaint").get_to(e.chief_complaint);
    j.at("history_present_illness").get_to(e.history_present_illness);
    j.at("past_medical_history").get_to(e.past_medical_history);
    j.at("medications").get_to(e.medications);
    j.at("habits_activities").get_to(e.habits_activities);
    j.at("physical_exam").get_to(e.physical_exam);
    j.at("treatment_plan").get_to(e.treatment_plan);
}

inline void to_json(nlohmann::json& j, const Patient& p) {
    j = nlohmann::json{
        {"healthcare_id", p.healthcare_id},
        {"name", p.name},
        {"mom_name", p.mom_name},
        {"birth_date", p.birth_date},
        {"cpf", p.cpf},
        {"gender", p.gender},
        {"address", p.address},
        {"profession", p.profession},
        {"phone", p.phone},
        {"evaluations", p.evaluations}
    };
    if (p.id) j["id"] = *p.id;
}

inline void from_json(const nlohmann::json& j, Patient& p) {
    if (j.contains("id")) p.id = j.at("id").get<int>();
    j.at("healthcare_id").get_to(p.healthcare_id);
    j.at("name").get_to(p.name);
    j.at("mom_name").get_to(p.mom_name);
    j.at("birth_date").get_to(p.birth_date);
    j.at("cpf").get_to(p.cpf);
    j.at("gender").get_to(p.gender);
    j.at("address").get_to(p.address);
    j.at("profession").get_to(p.profession);
    p.phone = j.value("phone", std::vector<std::string>{});
    p.evaluations = j.value("evaluations", std::vector<Evaluation>{});
}

} // namespace clinic
