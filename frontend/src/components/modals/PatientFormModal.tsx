import React, { useState } from 'react';
import { Patient } from '../../types';
import './Modal.css';

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Patient) => void;
}

const PatientFormModal: React.FC<PatientFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const initialPatient: Patient = {
    healthcare_id: '', name: '', mom_name: '', age: 0, cpf: '', 
    birth_date: '', evaluation_date: new Date().toISOString().split('T')[0],
    gender: 'Masculino', address: '', profession: '', phone: '', doctor: '',
    medical_diagnosis: '', chief_complaint: '', history_present_illness: '',
    past_medical_history: '', medications: '', habits_activities: '',
    physical_exam: '', treatment_plan: ''
  };

  const [formData, setFormData] = useState<Patient>(initialPatient);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'age' ? parseInt(value) || 0 : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData(initialPatient);
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
                <label htmlFor="age">Idade</label>
                <input id="age" type="number" name="age" value={formData.age} onChange={handleChange} />
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
                <label htmlFor="phone">Telefone</label>
                <input id="phone" type="text" name="phone" value={formData.phone} onChange={handleChange} />
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
