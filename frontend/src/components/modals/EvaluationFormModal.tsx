import React, { useState } from 'react';
import { Evaluation } from '../../types';
import './Modal.css';

interface EvaluationFormModalProps {
  isOpen: boolean;
  patientId: number | null;
  onClose: () => void;
  onSave: (evaluation: Evaluation) => void;
}

const EvaluationFormModal: React.FC<EvaluationFormModalProps> = ({ isOpen, patientId, onClose, onSave }) => {
  const initialEval: Evaluation = {
    patient_id: patientId || 0,
    evaluation_date: new Date().toISOString().split('T')[0],
    age: 0,
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

  const [formData, setFormData] = useState<Evaluation>(initialEval);

  if (!isOpen || !patientId) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'age' ? parseInt(value) || 0 : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, patient_id: patientId });
    setFormData(initialEval);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content detail-modal">
        <div className="modal-header">
          <h2 className="modal-title">Nova Entrada Clínica</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body-scroll">
          <section className="form-section">
            <h3>🏥 Dados da Avaliação</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="eval_date">Data da Avaliação</label>
                <input id="eval_date" type="date" name="evaluation_date" value={formData.evaluation_date} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="eval_age">Idade na Data</label>
                <input id="eval_age" type="number" name="age" value={formData.age} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="eval_doctor">Médico Solicitante</label>
                <input id="eval_doctor" type="text" name="doctor" value={formData.doctor} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="eval_diag">Diagnóstico Médico</label>
              <input id="eval_diag" type="text" name="medical_diagnosis" value={formData.medical_diagnosis} onChange={handleChange} />
            </div>
          </section>

          <section className="form-section">
            <h3>📋 Avaliação Clínica</h3>
            <div className="form-group">
              <label htmlFor="eval_chief">Queixa Principal</label>
              <textarea id="eval_chief" name="chief_complaint" value={formData.chief_complaint} onChange={handleChange} rows={2} />
            </div>
            <div className="form-group">
              <label htmlFor="eval_hda">História da Doença Atual (HDA)</label>
              <textarea id="eval_hda" name="history_present_illness" value={formData.history_present_illness} onChange={handleChange} rows={3} />
            </div>
            <div className="form-group">
              <label htmlFor="eval_phys">Exame Físico / Complementares</label>
              <textarea id="eval_phys" name="physical_exam" value={formData.physical_exam} onChange={handleChange} rows={4} />
            </div>
            <div className="form-group">
              <label htmlFor="eval_plan">Plano de Tratamento</label>
              <textarea id="eval_plan" name="treatment_plan" value={formData.treatment_plan} onChange={handleChange} rows={4} className="treatment-textarea" />
            </div>
          </section>

          <div className="modal-actions footer-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">Salvar Entrada</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EvaluationFormModal;
