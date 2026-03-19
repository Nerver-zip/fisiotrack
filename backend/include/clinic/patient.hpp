#pragma once

#include <string>
#include <optional>
#include <vector>
#include <nlohmann/json.hpp>

namespace clinic {

/**
 * @brief Representa uma entrada clínica (ficha de avaliação) em uma data específica.
 */
struct Evaluation {
    std::optional<int> id;
    int patient_id;
    std::string evaluation_date;
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
    e.patient_id = j.value("patient_id", 0);
    e.evaluation_date = j.value("evaluation_date", "");
    e.doctor = j.value("doctor", "");
    e.medical_diagnosis = j.value("medical_diagnosis", "");
    e.chief_complaint = j.value("chief_complaint", "");
    e.history_present_illness = j.value("history_present_illness", "");
    e.past_medical_history = j.value("past_medical_history", "");
    e.medications = j.value("medications", "");
    e.habits_activities = j.value("habits_activities", "");
    e.physical_exam = j.value("physical_exam", "");
    e.treatment_plan = j.value("treatment_plan", "");
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
    p.healthcare_id = j.value("healthcare_id", "");
    p.name = j.value("name", "");
    p.mom_name = j.value("mom_name", "");
    p.birth_date = j.value("birth_date", "");
    p.cpf = j.value("cpf", "");
    p.gender = j.value("gender", "");
    p.address = j.value("address", "");
    p.profession = j.value("profession", "");
    p.phone = j.value("phone", std::vector<std::string>{});
    p.evaluations = j.value("evaluations", std::vector<Evaluation>{});
}

/**
 * @brief Registro de auditoria para rastreamento de modificações.
 */
struct AuditLog {
    int id;
    std::string timestamp;
    std::string action;
    int entity_id;
    std::string details;
    std::string user_info;
};

inline void to_json(nlohmann::json& j, const AuditLog& l) {
    j = nlohmann::json{
        {"id", l.id},
        {"timestamp", l.timestamp},
        {"action", l.action},
        {"entity_id", l.entity_id},
        {"details", l.details},
        {"user_info", l.user_info}
    };
}

} // namespace clinic
