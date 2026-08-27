import React, { useState, useEffect, useRef } from 'react';
import { Appointment, Patient } from '../../types';
import { API_BASE_URL } from '../../config';
import { Search, User, Clock, Calendar as CalendarIcon, FileText, AlertCircle, PlusCircle, Timer } from 'lucide-react';
import './Modal.css';

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appt: Appointment) => void;
  apptToEdit?: Appointment | null;
  currentDate: string;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  checkConflicts: (appt: Partial<Appointment>) => Appointment[];
}

const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({
  isOpen, onClose, onSave, apptToEdit, currentDate, fetchWithAuth, checkConflicts
}) => {
  const [formData, setFormData] = useState<Appointment>({
    patient_name: '',
    appointment_date: currentDate,
    appointment_time: '09:00',
    duration_minutes: 30,
    notes: '',
    status: 'scheduled'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Patient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const skipNextSearchRef = useRef(false);

  useEffect(() => {
    if (apptToEdit) {
      setFormData(apptToEdit);
      setSearchTerm(apptToEdit.patient_name);
    } else {
      setFormData({
        patient_name: '',
        appointment_date: currentDate,
        appointment_time: '09:00',
        duration_minutes: 30,
        notes: '',
        status: 'scheduled'
      });
      setSearchTerm('');
    }
  }, [apptToEdit, isOpen, currentDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    let cancelled = false;

    const loadSuggestions = async () => {
      try {
        setIsSearching(true);
        const response = await fetchWithAuth(`${API_BASE_URL}/api/patients?q=${encodeURIComponent(searchTerm)}`);
        if (!response.ok || cancelled) return;

        const data = await response.json();
        if (cancelled) return;

        setSuggestions(data);
        setShowSuggestions(true);
      } catch (err) {
        if (!cancelled) {
          console.error('Erro na busca:', err);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    };

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [searchTerm, fetchWithAuth]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setFormData(prev => ({ ...prev, patient_name: term, patient_id: undefined }));
  };

  const selectPatient = (patient: Patient) => {
    skipNextSearchRef.current = true;
    setFormData(prev => ({
      ...prev,
      patient_id: patient.id,
      patient_name: patient.name
    }));
    setSearchTerm(patient.name);
    setShowSuggestions(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration_minutes' ? parseInt(value) : value
    }));
  };

  const conflicts = checkConflicts(formData);
  const hasConflict = conflicts.length > 0;

  const isRegisteredPatient = !!formData.patient_id;
  const isEditMode = !!apptToEdit;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content appointment-modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEditMode ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
          <div className="modal-body-scroll">
            <div className="form-group">
              <label htmlFor="patient-search">Paciente</label>
              <div className="search-box-modal" ref={suggestionRef}>
                <User size={18} className="search-icon" />
                <input
                  id="patient-search"
                  type="text"
                  className="search-input"
                  placeholder="Buscar paciente ou digitar nome..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                  readOnly={isEditMode && isRegisteredPatient}
                  style={{
                    backgroundColor: (isEditMode && isRegisteredPatient) ? '#f5f5f5' : 'white',
                    cursor: (isEditMode && isRegisteredPatient) ? 'not-allowed' : 'text'
                  }}
                  required
                />
                {isSearching && <div className="search-spinner-inline" />}
                {!isEditMode && showSuggestions && suggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {suggestions.map(p => (
                      <div key={p.id} className="suggestion-item" onClick={() => selectPatient(p)}>
                        <span className="suggestion-name">{p.name}</span>
                        <span className="suggestion-info">CPF: {p.cpf || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="appt-date">Data</label>
                <div className="input-with-icon">
                  <CalendarIcon size={16} />
                  <input
                    id="appt-date"
                    type="date"
                    name="appointment_date"
                    value={formData.appointment_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="appt-time">Horário</label>
                <div className="input-with-icon">
                  <Clock size={16} />
                  <input
                    id="appt-time"
                    type="time"
                    name="appointment_time"
                    value={formData.appointment_time}
                    onChange={handleChange}
                    lang="pt-BR"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="appt-duration">Duração (min)</label>
                <div className="input-with-icon">
                  <Timer size={16} />
                  <input
                    id="appt-duration"
                    type="number"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleChange}
                    min="5"
                    step="5"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="appt-status">Status do Atendimento</label>
              <select id="appt-status" name="status" value={formData.status} onChange={handleChange}>
                <option value="scheduled">Agendado</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
                <option value="no-show">Faltou</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="appt-notes">Observações</label>
              <div className="input-with-icon-top">
                <FileText size={16} />
                <textarea
                  id="appt-notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Ex: Motivo da consulta, observações importantes..."
                  rows={3}
                />
              </div>
            </div>

            {hasConflict && (
              <div className="conflict-banner-unimed">
                <AlertCircle size={20} />
                <div className="conflict-content">
                  <strong>Aviso de Conflito</strong>
                  <p>Este horário sobrepõe o agendamento de: <span>{conflicts.map(c => c.patient_name).join(', ')}</span></p>
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions footer-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary btn-with-icon">
              <PlusCircle size={20} />
              <span>{apptToEdit ? 'Salvar Alterações' : 'Confirmar Agendamento'}</span>
            </button>
          </div>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .appointment-modal {
          width: 95%;
          max-width: 650px !important;
          max-height: 95vh;
          display: flex;
          flex-direction: column;
        }

        .appointment-modal form {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          width: 100%;
        }

        .appointment-modal .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .appointment-modal .form-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 1.5rem;
          }
        }

        .modal-body-scroll {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 0.5rem;
          margin-bottom: 0;
        }

        .footer-actions {
          margin-top: auto;
          padding-top: 1.5rem;
          background: white;
          width: 100%;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .input-with-icon svg {
          position: absolute;
          left: 10px;
          color: #999;
          pointer-events: none;
        }

        .input-with-icon input {
          padding-left: 2.5rem !important;
          width: 100%;
          min-width: 0; /* Previne overflow em flexbox */
        }

        .input-with-icon-top {
          position: relative;
        }

        .input-with-icon-top svg {
          position: absolute;
          left: 10px;
          top: 12px;
          color: #999;
          pointer-events: none;
        }

        .input-with-icon-top textarea {
          padding-left: 2.5rem !important;
          width: 100%;
          min-width: 100%;
          max-width: 100%;
          resize: none;
          line-height: 1.5;
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
        }

        .suggestions-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid var(--unimed-border);
          border-top: none;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          z-index: 1100;
          max-height: 250px;
          overflow-y: auto;
        }

        .suggestion-item {
          padding: 10px 15px;
          cursor: pointer;
          border-bottom: 1px solid #f5f5f5;
          transition: background 0.2s;
        }

        .suggestion-item:hover {
          background-color: #f0fdf4;
        }

        .suggestion-name {
          display: block;
          font-weight: 600;
          color: var(--unimed-text);
          font-size: 0.95rem;
        }

        .suggestion-info {
          font-size: 0.8rem;
          color: #888;
        }

        .conflict-banner-unimed {
          display: flex;
          gap: 1rem;
          background-color: #fff9f0;
          border: 1px solid var(--unimed-orange);
          border-left: 5px solid var(--unimed-orange);
          padding: 1rem;
          border-radius: 4px;
          color: #856404;
          margin-top: 1rem;
          align-items: flex-start;
        }

        .conflict-content strong {
          display: block;
          margin-bottom: 0.2rem;
          color: var(--unimed-orange);
          font-size: 0.9rem;
          text-transform: uppercase;
        }

        .conflict-content p {
          margin: 0;
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .conflict-content span {
          font-weight: 700;
        }

        .search-spinner-inline {
          position: absolute;
          right: 12px;
          top: 12px;
          width: 16px;
          height: 16px;
          border: 2px solid #eee;
          border-top: 2px solid var(--unimed-green);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default AppointmentFormModal;
