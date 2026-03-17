import React, { useState } from 'react';
import { Patient, Evaluation } from '../../types';
import './Modal.css';

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Patient) => void;
}

// Tipo auxiliar para capturar todos os dados do formulário (Paciente + Avaliação Inicial)
interface PatientFormData {
  healthcare_id: string;
  name: string;
  mom_name: string;
  birth_date: string;
  cpf: string;
  gender: string;
  address: string;
  profession: string;
  phone: string; // Capturamos como string (ex: "11999999999, 11888888888")
  // Campos da Avaliação
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

const calculateAge = (birthDate: string, evaluationDate: string): number => {
  if (!birthDate || !evaluationDate) return 0;
  const birth = new Date(birthDate + 'T00:00:00'); // Add T00:00:00 to avoid timezone issues
  const evaluation = new Date(evaluationDate + 'T00:00:00');
  
  let age = evaluation.getFullYear() - birth.getFullYear();
  const m = evaluation.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && evaluation.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const PatientFormModal: React.FC<PatientFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const initialFormData: PatientFormData = {
    healthcare_id: '', name: '', mom_name: '', cpf: '', 
    birth_date: '', gender: 'Masculino', address: '', profession: '', phone: '',
    evaluation_date: new Date().toISOString().split('T')[0],
    doctor: '',
    medical_diagnosis: '', 
    chief_complaint: '', 
    history_present_illness: '',
    past_medical_history: '', 
    medications: '', 
    habits_activities: '',
    physical_exam: '', 
    treatment_plan: ''
  };

  const [formData, setFormData] = useState<PatientFormData>(initialFormData);
  const currentAge = calculateAge(formData.birth_date, formData.evaluation_date);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Processa os telefones (separa por vírgula e remove espaços)
    const phoneArray = formData.phone.split(',').map(p => p.trim()).filter(p => p !== '');

    // Constrói o objeto Patient seguindo a nova estrutura (Paciente -> Lista de Avaliações)
    const patient: Patient = {
      healthcare_id: formData.healthcare_id,
      name: formData.name,
      mom_name: formData.mom_name,
      birth_date: formData.birth_date,
      cpf: formData.cpf,
      gender: formData.gender,
      address: formData.address,
      profession: formData.profession,
      phone: phoneArray,
      evaluations: [
        {
          patient_id: 0, // Será preenchido pelo backend
          evaluation_date: formData.evaluation_date,
          doctor: formData.doctor,
          medical_diagnosis: formData.medical_diagnosis,
          chief_complaint: formData.chief_complaint,
          history_present_illness: formData.history_present_illness,
          past_medical_history: formData.past_medical_history,
          medications: formData.medications,
          habits_activities: formData.habits_activities,
          physical_exam: formData.physical_exam,
          treatment_plan: formData.treatment_plan
        }
      ]
    };

    onSave(patient);
    setFormData(initialFormData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content detail-modal">
        <div className="modal-header">
          <h2 className="modal-title">Nova Ficha de Avaliação</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body-scroll">
          <section className="form-section">
            <h3>📍 Identificação</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="healthcare_id">ID Convênio / SUS</label>
                <input id="healthcare_id" type="text" name="healthcare_id" value={formData.healthcare_id} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="name">Nome Completo</label>
                <input id="name" type="text" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="mom_name">Nome da Mãe</label>
                <input id="mom_name" type="text" name="mom_name" value={formData.mom_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="age_display">Idade</label>
                <input id="age_display" type="number" value={currentAge} readOnly />
              </div>
              <div className="form-group">
                <label htmlFor="cpf">CPF</label>
                <input id="cpf" type="text" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" />
              </div>
              <div className="form-group">
                <label htmlFor="gender">Sexo</label>
                <select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="birth_date">Nascimento</label>
                <input id="birth_date" type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="profession">Profissão</label>
                <input id="profession" type="text" name="profession" value={formData.profession} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Telefone(s)</label>
                <input id="phone" type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Ex: (11) 99999-9999, (11) 88888-8888" />
              </div>
            </div>
            <div className="form-group full-width" style={{ marginTop: '1rem' }}>
              <label htmlFor="address">Endereço</label>
              <input id="address" type="text" name="address" value={formData.address} onChange={handleChange} />
            </div>
          </section>

          <section className="form-section">
            <h3>🏥 Histórico e Avaliação</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="doctor">Médico Solicitante</label>
                <input id="doctor" type="text" name="doctor" value={formData.doctor} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="evaluation_date">Data da Avaliação</label>
                <input id="evaluation_date" type="date" name="evaluation_date" value={formData.evaluation_date} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="medical_diagnosis">Diagnóstico Médico</label>
                <input id="medical_diagnosis" type="text" name="medical_diagnosis" value={formData.medical_diagnosis} onChange={handleChange} />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="chief_complaint">Queixa Principal</label>
              <textarea id="chief_complaint" name="chief_complaint" value={formData.chief_complaint} onChange={handleChange} rows={2} />
            </div>
            <div className="form-group">
              <label htmlFor="history_present_illness">História da Doença Atual (HDA)</label>
              <textarea id="history_present_illness" name="history_present_illness" value={formData.history_present_illness} onChange={handleChange} rows={3} />
            </div>
            <div className="form-group">
              <label htmlFor="past_medical_history">História Patológica Pregressa (HPP)</label>
              <textarea id="past_medical_history" name="past_medical_history" value={formData.past_medical_history} onChange={handleChange} rows={2} />
            </div>
            <div className="form-group">
              <label htmlFor="medications">Medicamentos em uso</label>
              <textarea id="medications" name="medications" value={formData.medications} onChange={handleChange} rows={2} />
            </div>
            <div className="form-group">
              <label htmlFor="habits_activities">Atividades e Hábitos</label>
              <textarea id="habits_activities" name="habits_activities" value={formData.habits_activities} onChange={handleChange} rows={2} />
            </div>
            <div className="form-group">
              <label htmlFor="physical_exam">Exame Físico / Complementares</label>
              <textarea id="physical_exam" name="physical_exam" value={formData.physical_exam} onChange={handleChange} rows={4} />
            </div>
            <div className="form-group">
              <label htmlFor="treatment_plan">Plano de Tratamento</label>
              <textarea id="treatment_plan" name="treatment_plan" value={formData.treatment_plan} onChange={handleChange} rows={4} className="treatment-textarea" />
            </div>
          </section>

          <div className="modal-actions footer-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">Salvar Ficha</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientFormModal;
