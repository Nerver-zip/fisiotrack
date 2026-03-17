import React, { useState, useEffect } from 'react';
import { Evaluation } from '../../types';
import { calculateAge } from '../../utils';
import EditConfirmationModal from './EditConfirmationModal';
import './Modal.css';

interface EvaluationFormModalProps {
  isOpen: boolean;
  patientId: number | null;
  patientBirthDate: string;
  onClose: () => void;
  onSave: (evaluation: Evaluation) => void;
  evaluationToEdit?: Evaluation | null;
}

const EvaluationFormModal: React.FC<EvaluationFormModalProps> = ({ 
  isOpen, 
  patientId, 
  patientBirthDate, 
  onClose, 
  onSave,
  evaluationToEdit
}) => {
  const initialEval: Evaluation = {
    patient_id: patientId || 0,
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

  const [formData, setFormData] = useState<Evaluation>(initialEval);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [changedFields, setChangedFields] = useState<string[]>([]);
  const [pendingEvalData, setPendingEvalData] = useState<Evaluation | null>(null);

  useEffect(() => {
    if (evaluationToEdit) {
      setFormData(evaluationToEdit);
    } else {
      setFormData({
        ...initialEval,
        patient_id: patientId || 0
      });
    }
    setIsConfirmModalOpen(false);
  }, [evaluationToEdit, isOpen, patientId]);

  const currentAge = calculateAge(patientBirthDate, formData.evaluation_date);

  if (!isOpen || !patientId) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = { ...formData, patient_id: patientId };

    if (evaluationToEdit) {
      // Detectar mudanças
      const changes: string[] = [];
      const fieldsToCompare: (keyof Evaluation)[] = [
        'evaluation_date', 'doctor', 'medical_diagnosis', 'chief_complaint',
        'history_present_illness', 'past_medical_history', 'medications',
        'habits_activities', 'physical_exam', 'treatment_plan'
      ];

      fieldsToCompare.forEach(field => {
        if (finalData[field] !== (evaluationToEdit[field] || '')) {
          changes.push(field);
        }
      });

      if (changes.length === 0) {
        onClose();
        return;
      }

      setChangedFields(changes);
      setPendingEvalData(finalData);
      setIsConfirmModalOpen(true);
    } else {
      onSave(finalData);
    }
  };

  const handleConfirmSave = () => {
    if (pendingEvalData) {
      onSave(pendingEvalData);
      setIsConfirmModalOpen(false);
    }
  };

  const fieldLabels: { [key: string]: string } = {
    evaluation_date: 'Data da Avaliação',
    doctor: 'Médico Solicitante',
    medical_diagnosis: 'Diagnóstico Médico',
    chief_complaint: 'Queixa Principal',
    history_present_illness: 'HDA',
    past_medical_history: 'HPP',
    medications: 'Medicamentos',
    habits_activities: 'Atividades e Hábitos',
    physical_exam: 'Exame Físico',
    treatment_plan: 'Plano de Tratamento'
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content detail-modal">
          <div className="modal-header">
            <h2 className="modal-title">{evaluationToEdit ? 'Editar Entrada Clínica' : 'Nova Entrada Clínica'}</h2>
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
                  <label htmlFor="eval_age_display">Idade</label>
                  <input id="eval_age_display" type="number" value={currentAge} readOnly />
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
              <button type="submit" className="btn-primary">{evaluationToEdit ? 'Atualizar Entrada' : 'Salvar Entrada'}</button>
            </div>
          </form>
        </div>
      </div>

      <EditConfirmationModal 
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmSave}
        changedFields={changedFields}
        fieldLabels={fieldLabels}
        title="Confirmar Alterações na Entrada"
      />
    </>
  );
};

export default EvaluationFormModal;
