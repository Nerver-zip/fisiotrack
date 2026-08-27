import React, { useState, useEffect } from 'react';
import { Patient, Appointment } from '../../types';
import { formatDate } from '../../utils';
import { History, CheckCircle2, Clock, AlertCircle, HelpCircle, X, Pencil, Trash2, PlusCircle } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import ConfirmationModal from './ConfirmationModal';
import './Modal.css';

interface SessionHistoryModalProps {
  isOpen: boolean;
  patient: Patient | null;
  onClose: () => void;
  onEditSession: (appt: Appointment) => void;
  onNewAppointment: (patient: Patient) => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  refreshPatientData: () => void; // Para atualizar o session_count na tela principal
}

const SessionHistoryModal: React.FC<SessionHistoryModalProps> = ({
  isOpen,
  patient,
  onClose,
  onEditSession,
  onNewAppointment,
  fetchWithAuth,
  refreshPatientData
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para confirmação
  const [sessionToComplete, setSessionToComplete] = useState<Appointment | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<Appointment | null>(null);

  useEffect(() => {
    if (isOpen && patient?.id) {
      loadHistory();
    } else {
      setAppointments([]);
    }
  }, [isOpen, patient?.id]);

  const loadHistory = async () => {
    if (!patient?.id) return;
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/patients/${patient.id}/appointments`);
      if (response.ok) {
        const data = await response.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appt: Appointment, newStatus: string) => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/appointments/${appt.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...appt, status: newStatus })
      });
      if (response.ok) {
        setSessionToComplete(null);
        loadHistory();
        refreshPatientData();
      }
    } catch (err) {
      alert('Erro ao atualizar status da sessão');
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete?.id) return;
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/appointments/${sessionToDelete.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setSessionToDelete(null);
        loadHistory();
        refreshPatientData();
      }
    } catch (err) {
      alert('Erro ao excluir sessão');
    }
  };

  if (!isOpen || !patient) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={18} color="var(--unimed-green)" />;
      case 'scheduled': return <Clock size={18} color="var(--unimed-blue)" />;
      case 'cancelled': return <AlertCircle size={18} color="var(--unimed-red)" />;
      default: return <HelpCircle size={18} color="#666" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'scheduled': return 'Agendado';
      case 'cancelled': return 'Cancelado';
      case 'no-show': return 'Faltou';
      default: return status;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content detail-modal">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <History className="text-primary" size={24} />
            <h2 className="modal-title">Histórico de Sessões: {patient.name}</h2>
          </div>
          <button className="btn-close" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="modal-body-scroll">
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#666', margin: 0 }}>Relação completa de atendimentos e agendamentos registrados.</p>
            <span className="session-count-badge">
              {patient.session_count || 0} sessões concluídas
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>Carregando histórico...</div>
          ) : appointments.length > 0 ? (
            <div className="appointments-timeline">
              {appointments.map(appt => (
                <div key={appt.id} className={`timeline-item status-${appt.status}`}>
                  <div className="timeline-marker">
                    {getStatusIcon(appt.status)}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="timeline-date">{formatDate(appt.appointment_date)} às {appt.appointment_time}</span>
                        <span className={`status-pill ${appt.status}`}>{getStatusLabel(appt.status)}</span>
                      </div>

                      <div className="timeline-buttons">
                        {appt.status !== 'completed' && (
                          <button
                            className="btn-icon-tiny"
                            onClick={() => setSessionToComplete(appt)}
                            title="Marcar como Concluído"
                            style={{ color: '#333' }}
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}
                        <button
                          className="btn-icon-tiny"
                          onClick={() => onEditSession(appt)}
                          title="Editar Sessão"
                          style={{ color: 'var(--unimed-blue)' }}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          className="btn-icon-tiny"
                          onClick={() => setSessionToDelete(appt)}
                          title="Excluir Sessão"
                          style={{ color: 'var(--unimed-red)' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    {appt.notes && <p className="timeline-notes">{appt.notes}</p>}
                    <div className="timeline-footer">
                      <span>Duração: {appt.duration_minutes} min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#666', border: '1px dashed #ddd', borderRadius: '8px' }}>
              Nenhum agendamento encontrado para este paciente.
            </div>
          )}
        </div>

        <div className="modal-actions footer-actions">
          <button className="btn-cancel" onClick={onClose}>Fechar</button>
          <button className="btn-primary btn-with-icon" onClick={() => patient && onNewAppointment(patient)}>
            <PlusCircle size={20} />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Modais de Confirmação Internos */}
      <ConfirmationModal
        isOpen={!!sessionToComplete}
        title="Concluir Sessão"
        message="Deseja marcar esta sessão como concluída? Isso atualizará a contagem de sessões do paciente."
        confirmText="Confirmar"
        onConfirm={() => sessionToComplete && handleUpdateStatus(sessionToComplete, 'completed')}
        onCancel={() => setSessionToComplete(null)}
      />

      <ConfirmationModal
        isOpen={!!sessionToDelete}
        title="Excluir Sessão"
        message="Tem certeza que deseja excluir permanentemente este registro de sessão?"
        confirmText="Excluir"
        onConfirm={handleDeleteSession}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
};

export default SessionHistoryModal;
