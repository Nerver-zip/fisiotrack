import React, { useState, useEffect } from 'react';
import { Patient, Evaluation } from '../../types';
import { calculateAge } from '../../utils';
import './Modal.css';

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Patient) => void;
  patientToEdit?: Patient | null;
}

const PatientFormModal: React.FC<PatientFormModalProps> = ({ isOpen, onClose, onSave, patientToEdit }) => {
  const initialFormState = {
    healthcare_id: '',
    name: '',
    mom_name: '',
    birth_date: '1990-01-01',
    cpf: '',
    gender: 'Masculino' as const,
    address: '',
    profession: '',
    phone: '',
    // Campos da avaliação inicial (apenas para novo paciente)
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

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (patientToEdit) {
      setFormData({
        ...initialFormState,
        healthcare_id: patientToEdit.healthcare_id || '',
        name: patientToEdit.name || '',
        mom_name: patientToEdit.mom_name || '',
        birth_date: patientToEdit.birth_date || '1990-01-01',
        cpf: patientToEdit.cpf || '',
        gender: (patientToEdit.gender as any) || 'Masculino',
        address: patientToEdit.address || '',
        profession: patientToEdit.profession || '',
        phone: Array.isArray(patientToEdit.phone) ? patientToEdit.phone.join(', ') : ''
      });
    } else {
      setFormData(initialFormState);
    }
  }, [patientToEdit, isOpen]);

  if (!isOpen) return null;

  const currentAge = calculateAge(formData.birth_date, patientToEdit ? new Date().toISOString().split('T')[0] : formData.evaluation_date);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const phoneArray = formData.phone
      .split(',')
      .map(p => p.trim())
      .filter(p => p !== '');

    const patientData: Patient = {
      id: patientToEdit?.id,
      healthcare_id: formData.healthcare_id,
      name: formData.name,
      mom_name: formData.mom_name,
      birth_date: formData.birth_date,
      cpf: formData.cpf,
      gender: formData.gender,
      address: formData.address,
      profession: formData.profession,
      phone: phoneArray,
      evaluations: patientToEdit ? undefined : [
        {
          patient_id: 0,
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

    onSave(patientData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content detail-modal">
        <div className="modal-header">
          <h2 className="modal-title">{patientToEdit ? 'Editar Dados Cadastrais' : 'Nova Ficha de Paciente'}</h2>
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
                <input id="birth_date" type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="profession">Profissão</label>
                <input id="profession" type="text" name="profession" value={formData.profession} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Telefone (separe por vírgula)</label>
                <input id="phone" type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Ex: 11999998888, 11777776666" />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="address">Endereço Completo</label>
              <input id="address" type="text" name="address" value={formData.address} onChange={handleChange} />
            </div>
          </section>

          {!patientToEdit && (
            <section className="form-section">
              <h3>🏥 Avaliação Inicial</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="eval_date">Data da Avaliação</label>
                  <input id="eval_date" type="date" name="evaluation_date" value={formData.evaluation_date} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="eval_doctor">Médico Solicitante</label>
                  <input id="eval_doctor" type="text" name="doctor" value={formData.doctor} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="eval_diag">Diagnóstico Médico</label>
                  <input id="eval_diag" type="text" name="medical_diagnosis" value={formData.medical_diagnosis} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="eval_chief">Queixa Principal</label>
                <textarea id="eval_chief" name="chief_complaint" value={formData.chief_complaint} onChange={handleChange} rows={2} />
              </div>
              <div className="form-group">
                <label htmlFor="eval_hda">História da Doença Atual (HDA)</label>
                <textarea id="eval_hda" name="history_present_illness" value={formData.history_present_illness} onChange={handleChange} rows={3} />
              </div>
              <div className="form-group">
                <label htmlFor="eval_hpp">História Patológica Pregressa (HPP)</label>
                <textarea id="eval_hpp" name="past_medical_history" value={formData.past_medical_history} onChange={handleChange} rows={2} />
              </div>
              <div className="form-group">
                <label htmlFor="eval_meds">Medicamentos em uso</label>
                <textarea id="eval_meds" name="medications" value={formData.medications} onChange={handleChange} rows={2} />
              </div>
              <div className="form-group">
                <label htmlFor="eval_hab">Atividades e Hábitos</label>
                <textarea id="eval_hab" name="habits_activities" value={formData.habits_activities} onChange={handleChange} rows={2} />
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
          )}

          <div className="modal-actions footer-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">{patientToEdit ? 'Atualizar Dados' : 'Salvar Ficha'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientFormModal;
