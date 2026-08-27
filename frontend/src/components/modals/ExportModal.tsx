import React, { useState, useMemo } from 'react';
import { X, Search, FileDown, CheckSquare, Square } from 'lucide-react';
import { Patient } from '../../types';
import './Modal.css';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  onExport: (selectedIds: number[]) => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, patients, onExport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const filteredPatients = useMemo(() => {
    return patients.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cpf?.includes(searchTerm)
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [patients, searchTerm]);

  const togglePatient = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredPatients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPatients.map(p => p.id!).filter(id => id !== undefined)));
    }
  };

  const handleExport = () => {
    onExport(Array.from(selectedIds));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content export-modal">
        <div className="modal-header">
          <h2 className="modal-title">Exportar Dados (JSON)</h2>
          <button className="modal-close btn-close" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: 'var(--spacing-sm)', color: '#666', fontSize: '0.85rem', lineHeight: '1.3' }}>
            Selecione os pacientes que deseja incluir na exportação. O arquivo gerado pode ser importado futuramente para restaurar os dados.
          </p>

          <div className="search-box-modal">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Pesquisar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="modal-controls">
            <button
              className="btn-secondary"
              onClick={toggleAll}
              style={{ fontSize: '0.85rem', padding: 'var(--spacing-xs) var(--spacing-sm)' }}
            >
              {selectedIds.size === filteredPatients.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>
            <span style={{ fontSize: '0.8rem', color: '#666' }}>
              {selectedIds.size} selecionado(s)
            </span>
          </div>

          <div style={{
            maxHeight: 'var(--modal-list-max-height)',
            overflowY: 'auto',
            border: '1px solid var(--unimed-border)',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9'
          }}>
            {filteredPatients.length > 0 ? (
              filteredPatients.map(patient => (
                <div
                  key={patient.id}
                  onClick={() => togglePatient(patient.id!)}
                  style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  className="patient-select-item"
                >
                  <div style={{ marginRight: 'var(--spacing-md)', color: 'var(--unimed-green)' }}>
                    {selectedIds.has(patient.id!) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{patient.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>
                      CPF: {patient.cpf || '---'} | Última Entrada: {patient.evaluations?.[0]?.evaluation_date || 'Nenhuma'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: '#999' }}>
                Nenhum paciente encontrado.
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions footer-actions" style={{ justifyContent: 'space-between' }}>
          <button className="btn-confirm-danger" onClick={onClose}>
            Voltar
          </button>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={selectedIds.size === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', minWidth: '160px' }}
          >
            <FileDown size={16} />
            Exportar JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
