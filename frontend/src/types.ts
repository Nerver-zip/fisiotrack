export interface Evaluation {
  id?: number;
  patient_id: number;
  evaluation_date: string;
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

export interface Patient {
  id?: number;
  healthcare_id: string;
  name: string;
  mom_name: string;
  birth_date: string;
  cpf: string;
  gender: string;
  address: string;
  profession: string;
  phone: string[];
  is_favorite?: boolean;
  updated_at?: string;
  evaluations?: Evaluation[];
}
