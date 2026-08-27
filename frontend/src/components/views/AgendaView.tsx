import React, { useState, useRef } from 'react';
import { Appointment } from '../../types';
import {
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface AgendaViewProps {
  currentDate: string;
  setCurrentDate: (date: string) => void;
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  onNewAppointment: () => void;
  onEditAppointment: (appt: Appointment) => void;
  onDeleteAppointment: (appt: Appointment) => void;
  checkConflicts: (appt: Partial<Appointment>) => Appointment[];
}

const AgendaView: React.FC<AgendaViewProps> = ({
  currentDate, setCurrentDate, appointments, loading, error,
  onNewAppointment, onEditAppointment, onDeleteAppointment, checkConflicts
}) => {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handlePrevDay = () => {
    const date = new Date(currentDate + 'T12:00:00');
    date.setDate(date.getDate() - 1);
    setCurrentDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(currentDate + 'T12:00:00');
    date.setDate(date.getDate() + 1);
    setCurrentDate(date.toISOString().split('T')[0]);
  };

  const openCalendar = () => {
    if (dateInputRef.current) {
      // showPicker() é suportado em navegadores modernos para abrir o calendário programaticamente
      if (typeof (dateInputRef.current as any).showPicker === 'function') {
        (dateInputRef.current as any).showPicker();
      } else {
        dateInputRef.current.click();
      }
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={16} className="text-green-600" />;
      case 'cancelled': return <XCircle size={16} className="text-red-500" />;
      case 'no-show': return <AlertCircle size={16} className="text-orange-500" />;
      default: return <Clock size={16} className="text-blue-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      case 'no-show': return 'Faltou';
      default: return 'Agendado';
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="header-content agenda-header-grid">
          <div className="header-title">
            <CalendarIcon size={24} className="text-primary" />
            <h1>Agenda</h1>
          </div>

          <div className="agenda-controls-center">
            <button className="nav-btn" onClick={handlePrevDay} title="Dia anterior">
              <ChevronLeft size={20} />
            </button>

            <div className="date-picker-trigger" onClick={openCalendar} title="Clique para escolher uma data">
              <CalendarIcon size={18} className="text-muted" />
              <span className="date-text-large">{formatDateDisplay(currentDate)}</span>
              <input
                ref={dateInputRef}
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="hidden-date-input"
              />
            </div>

            <button className="nav-btn" onClick={handleNextDay} title="Próximo dia">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="header-actions">
            <button className="btn-primary btn-with-icon" onClick={onNewAppointment}>
              <PlusCircle size={20} />
              <span>Novo Agendamento</span>
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="agenda-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando agenda...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-icon-wrapper">
              <CalendarIcon size={48} className="text-muted" />
            </div>
            <h3>Nenhum agendamento encontrado</h3>
            <p>Não há consultas registradas para o dia {formatDateDisplay(currentDate)}.</p>
          </div>
        ) : (
          <div className="appointment-grid">
            {appointments.map((appt) => {
              const conflicts = checkConflicts(appt);
              const hasConflict = conflicts.length > 0;

              return (
                <div key={appt.id} className={`appointment-card ${appt.status} ${hasConflict ? 'conflict' : ''}`}>
                  <div className="appt-time-section">
                    <Clock size={16} className="text-muted" />
                    <span className="time-start">{appt.appointment_time}</span>
                    <span className="time-duration">{appt.duration_minutes}m</span>
                  </div>

                  <div className="appt-main-info">
                    <div className="appt-header">
                      <span className="patient-name">{appt.patient_name}</span>
                    </div>
                    {appt.notes && <p className="appt-notes">{appt.notes}</p>}

                    <div className="appt-footer">
                      <div className={`status-pill ${appt.status}`}>
                        {getStatusIcon(appt.status)}
                        <span>{getStatusLabel(appt.status)}</span>
                      </div>
                      {hasConflict && (
                        <div className="conflict-badge" title={`Conflito com: ${conflicts.map(c => c.patient_name).join(', ')}`}>
                          <AlertCircle size={14} />
                          <span>Conflito</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="appt-actions-bar">
                    <button
                      className="btn-icon-sm"
                      onClick={() => onEditAppointment(appt)}
                      title="Editar Agendamento"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="btn-icon-sm danger"
                      onClick={() => onDeleteAppointment(appt)}
                      title="Remover Agendamento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .agenda-header-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          width: 100%;
          gap: 1rem;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .header-title h1 {
          font-size: 1.25rem;
          margin: 0;
          color: var(--unimed-green);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .agenda-controls-center {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-self: center;
        }

        .nav-btn {
          background: white;
          border: 1px solid var(--unimed-border);
          color: var(--unimed-text);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-btn:hover {
          background: #f8f9fa;
          border-color: var(--unimed-green);
          color: var(--unimed-green);
          transform: scale(1.05);
        }

        .date-picker-trigger {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: white;
          padding: 0.5rem 1.25rem;
          border-radius: 20px;
          border: 1px solid var(--unimed-border);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          min-width: 280px;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .date-picker-trigger:hover {
          border-color: var(--unimed-green);
          box-shadow: 0 4px 8px rgba(0,0,0,0.05);
        }

        .date-text-large {
          font-weight: 700;
          color: #333;
          font-size: 1rem;
          text-transform: capitalize;
        }

        .hidden-date-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
          pointer-events: none;
        }

        .header-actions {
          justify-self: end;
        }

        /* Reutilização e Refino dos estilos de conteúdo */
        .agenda-content {
          padding: 1.5rem 0;
        }

        .appointment-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .appointment-card {
          background: white;
          border-radius: 16px;
          border: 1px solid var(--unimed-border);
          display: flex;
          padding: 1.25rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        /* ... restante dos estilos mantidos e otimizados ... */
        .appointment-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.06);
          border-color: var(--unimed-green);
        }

        .appointment-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 6px;
          background: #dee2e6;
        }

        .appointment-card.scheduled::before { background: #339af0; }
        .appointment-card.completed::before { background: #40c057; }
        .appointment-card.cancelled::before { background: #fa5252; opacity: 0.5; }
        .appointment-card.no-show::before { background: #fd7e14; }
        .appointment-card.conflict { border-color: #f59e0b; }

        .appt-time-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding-right: 1.25rem;
          border-right: 1px dotted #eee;
          min-width: 85px;
        }

        .time-start {
          font-size: 1.2rem;
          font-weight: 700;
          color: #2c3e50;
          line-height: 1;
          margin: 0.25rem 0;
        }

        .time-duration {
          font-size: 0.75rem;
          color: #888;
          font-weight: 500;
        }

        .appt-main-info {
          flex: 1;
          padding-left: 1.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-width: 0; /* Crucial para o truncamento de texto em containers flex */
        }

        .appt-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          overflow: hidden;
        }

        .patient-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1a1a1a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .patient-badge {
          font-size: 0.65rem;
          background: #f1f3f5;
          color: #495057;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .appt-notes {
          font-size: 0.85rem;
          color: #666;
          margin: 0.4rem 0 0.8rem 0;
          padding-right: 2rem; /* Espaço para não encostar nos botões da direita */
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.5;
          word-break: break-word;
          max-width: 100%;
        }

        .appt-footer {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          background: #f8f9fa;
        }

        .status-pill.scheduled { color: #1c7ed6; background: #e7f5ff; }
        .status-pill.completed { color: #2b8a3e; background: #ebfbee; }
        .status-pill.cancelled { color: #c92a2a; background: #fff5f5; }
        .status-pill.no-show { color: #e67700; background: #fff4e6; }

        .conflict-badge {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          background: #fff9db;
          color: #e67700;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          animation: pulse-border 2s infinite;
        }

        @keyframes pulse-border {
          0% { box-shadow: 0 0 0 0 rgba(230, 119, 0, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(230, 119, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(230, 119, 0, 0); }
        }

        .appt-actions-bar {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-left: 0.5rem;
        }

        .btn-icon-sm {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          color: #495057;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-icon-sm:hover {
          background: white;
          border-color: var(--unimed-green);
          color: var(--unimed-green);
        }

        .btn-icon-sm.danger:hover {
          border-color: #fa5252;
          color: #fa5252;
          background: #fff5f5;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          background: white;
          border: 2px dashed #dee2e6;
        }

        .empty-icon-wrapper {
          background: #f8f9fa;
          padding: 2rem;
          border-radius: 50%;
          margin-bottom: 1.5rem;
        }

        .text-muted { color: #adb5bd; }

        @media (max-width: 1024px) {
          .agenda-header-grid {
            grid-template-columns: 1fr auto;
          }
          .header-title { display: none; }
        }

        @media (max-width: 768px) {
          .agenda-header-grid {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }
          .agenda-controls-center {
            width: 100%;
            justify-content: space-between;
          }
          .date-picker-trigger {
            min-width: unset;
            flex: 1;
          }
          .appointment-grid {
            grid-template-columns: 1fr;
          }
          .appt-actions-bar {
            flex-direction: row;
            position: absolute;
            top: 1rem;
            right: 1rem;
          }
        }
      `}} />
    </div>
  );
};

export default AgendaView;
