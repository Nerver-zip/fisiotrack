import React, { useState } from 'react';
import { Patient, Evaluation } from '../../types';
import { formatDate, calculateAge } from '../../utils';
import './Modal.css';

interface PatientDetailModalProps {
  isOpen: boolean;
  patient: Patient | null;
  onClose: () => void;
  onAddEvaluation: (patientId: number) => void;
  onEditPatient: (patient: Patient) => void;
}

const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ isOpen, patient, onClose, onAddEvaluation, onEditPatient }) => {
  const [selectedEvalId, setSelectedEvalId] = useState<number | null>(null);

  if (!isOpen || !patient) return null;

  const currentEval = selectedEvalId 
    ? patient.evaluations?.find(e => e.id === selectedEvalId) 
    : patient.evaluations?.[0];

  return (
    <div className="modal-overlay">
      <div className="modal-content detail-modal">
        <div className="modal-header">
          <h2 className="modal-title">Prontuário do Paciente</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body-scroll">
          <section className="detail-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ borderLeft: '4px solid var(--unimed-green)', paddingLeft: '10px' }}>📍 Dados Cadastrais</h3>
              <button 
                className="btn-edit" 
                onClick={() => onEditPatient(patient)}
              >
                ✏️ Editar Dados
              </button>
            </div>
            <div className="detail-grid">
              <p><strong>Nome:</strong> {patient.name || ''}</p>
              <p><strong>CPF:</strong> {patient.cpf || ''}</p>
              <p><strong>ID Convênio:</strong> {patient.healthcare_id || ''}</p>
              <p><strong>Nome da Mãe:</strong> {patient.mom_name || ''}</p>
              <p><strong>Nascimento:</strong> {formatDate(patient.birth_date)}</p>
              <p><strong>Sexo:</strong> {patient.gender || ''}</p>
              <p><strong>Profissão:</strong> {patient.profession || ''}</p>
              <p><strong>Telefone:</strong> {Array.isArray(patient.phone) ? patient.phone.join(', ') : (patient.phone || '')}</p>
            </div>
            <p style={{ marginTop: '0.5rem' }}><strong>Endereço:</strong> {patient.address || ''}</p>
          </section>

          <section className="detail-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>📅 Histórico de Entradas</h3>
              <button 
                className="btn-primary" 
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                onClick={() => patient.id && onAddEvaluation(patient.id)}
              >
                + Nova Entrada
              </button>
            </div>
            
            {patient.evaluations && patient.evaluations.length > 0 ? (
              <div className="evaluation-tabs">
                {patient.evaluations.map(e => (
                  <button 
                    key={e.id || e.evaluation_date}
                    className={`tab-item ${((selectedEvalId === null && patient.evaluations?.[0].id === e.id) || selectedEvalId === e.id) ? 'active' : ''}`}
                    onClick={() => e.id && setSelectedEvalId(e.id)}
                  >
                    {formatDate(e.evaluation_date)}
                  </button>
                ))}
              </div>
            ) : (
              <p>Nenhuma avaliação registrada.</p>
            )}
          </section>

          {currentEval && (
            <div className="evaluation-content">
              <section className="detail-section">
                <h3>🏥 Informações da Entrada ({formatDate(currentEval.evaluation_date)})</h3>
                <div className="detail-grid">
                  <p><strong>Médico:</strong> {currentEval.doctor || ''}</p>
                  <p><strong>Idade na data:</strong> {calculateAge(patient.birth_date, currentEval.evaluation_date)} anos</p>
                  <p><strong>Diagnóstico Médico:</strong> {currentEval.medical_diagnosis || ''}</p>
                </div>
              </section>

              <section className="detail-section">
                <p><strong>Queixa Principal:</strong></p>
                <div className="text-box">{currentEval.chief_complaint || ''}</div>
                
                <p><strong>História da Doença Atual (HDA):</strong></p>
                <div className="text-box">{currentEval.history_present_illness || ''}</div>

                <p><strong>História Patológica Pregressa (HPP):</strong></p>
                <div className="text-box">{currentEval.past_medical_history || ''}</div>

                <p><strong>Medicamentos em uso:</strong></p>
                <div className="text-box">{currentEval.medications || ''}</div>

                <p><strong>Atividades e Hábitos:</strong></p>
                <div className="text-box">{currentEval.habits_activities || ''}</div>

                <p><strong>Exame Físico / Complementares:</strong></p>
                <div className="text-box">{currentEval.physical_exam || ''}</div>
                
                <p><strong>Plano de Tratamento:</strong></p>
                <div className="text-box highlight">{currentEval.treatment_plan || ''}</div>
              </section>
            </div>
          )}
        </div>

        <div className="modal-actions footer-actions">
          <button className="btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailModal;
