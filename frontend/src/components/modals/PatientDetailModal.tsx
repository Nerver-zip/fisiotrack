import React from 'react';
import { Patient } from '../../types';
import './Modal.css';

interface PatientDetailModalProps {
  isOpen: boolean;
  patient: Patient | null;
  onClose: () => void;
}

const PatientDetailModal: React.FC<PatientDetailModalProps> = ({ isOpen, patient, onClose }) => {
  if (!isOpen || !patient) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content detail-modal">
        <div className="modal-header">
          <h2 className="modal-title">Ficha de Avaliação Fisioterapêutica</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body-scroll">
          <section className="detail-section">
            <h3>📍 Dados Pessoais</h3>
            <div className="detail-grid">
              <p><strong>ID:</strong> {patient.healthcare_id}</p>
              <p><strong>Nome:</strong> {patient.name}</p>
              <p><strong>Nome da mãe:</strong> {patient.mom_name}</p>
              <p><strong>Idade:</strong> {patient.age} anos</p>
              <p><strong>CPF:</strong> {patient.cpf}</p>
              <p><strong>Nascimento:</strong> {patient.birth_date}</p>
              <p><strong>Sexo:</strong> {patient.gender}</p>
              <p><strong>Profissão:</strong> {patient.profession}</p>
              <p><strong>Telefone:</strong> {patient.phone}</p>
              <p><strong>Endereço:</strong> {patient.address}</p>
            </div>
          </section>

          <section className="detail-section">
            <h3>🏥 Informações Médicas</h3>
            <div className="detail-list">
              <p><strong>Médico Responsável:</strong> {patient.doctor}</p>
              <p><strong>Data da Avaliação:</strong> {patient.evaluation_date}</p>
              <p><strong>Diagnóstico Médico:</strong> {patient.medical_diagnosis}</p>
            </div>
          </section>

          <section className="detail-section">
            <h3>📋 História Clínica</h3>
            <div className="detail-block">
              <p><strong>Queixa Principal:</strong></p>
              <div className="text-box">{patient.chief_complaint}</div>
              
              <p><strong>História da Doença Atual:</strong></p>
              <div className="text-box">{patient.history_present_illness}</div>
              
              <p><strong>História Patológica Pregressa:</strong></p>
              <div className="text-box">{patient.past_medical_history}</div>
              
              <p><strong>Medicamentos:</strong></p>
              <div className="text-box">{patient.medications}</div>
              
              <p><strong>Atividades e Hábitos:</strong></p>
              <div className="text-box">{patient.habits_activities}</div>
            </div>
          </section>

          <section className="detail-section">
            <h3>🩺 Exame Físico e Tratamento</h3>
            <div className="detail-block">
              <p><strong>Exames Complementares / Exame Físico:</strong></p>
              <div className="text-box">{patient.physical_exam}</div>
              
              <p><strong>Plano de Tratamento:</strong></p>
              <div className="text-box highlight">{patient.treatment_plan}</div>
            </div>
          </section>
        </div>

        <div className="modal-actions footer-actions">
          <button className="btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailModal;
