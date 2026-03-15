export interface Patient {
  id?: number;
  healthcare_id: string;
  name: string;
  mom_name: string;
  age: number;
  cpf: string;
  birth_date: string;
  evaluation_date: string;
  gender: string;
  address: string;
  profession: string;
  phone: string;
  doctor: string;
  medical_diagnosis: string;
  chief_complaint: string;
  history_present_illness: string;
  past_medical_history: string;
  medications: string;
  habits_activities: string;
  physical_exam: string;
  treatment_plan: string;
}
