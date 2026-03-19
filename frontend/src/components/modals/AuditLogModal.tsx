import React, { useEffect, useState } from 'react';
import { formatDate } from '../../utils';

interface AuditEntry {
  id: number;
  timestamp: string;
  action: string;
  entity_id: number;
  details: string;
  user_info: string;
}

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose, fetchWithAuth }) => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('http://localhost:8080/api/audit');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Erro ao carregar logs', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '900px', width: '90%' }}>
        <div className="modal-header">
          <h2>Registro de Auditoria (Últimas 100 ações)</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loading ? (
            <p>Carregando registros...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', color: '#666' }}>
                  <th style={{ padding: '0.5rem' }}>Data/Hora</th>
                  <th style={{ padding: '0.5rem' }}>Ação</th>
                  <th style={{ padding: '0.5rem' }}>ID Entidade</th>
                  <th style={{ padding: '0.5rem' }}>Detalhes</th>
                  <th style={{ padding: '0.5rem' }}>Sessão</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Nenhum registro encontrado.</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{new Date(log.timestamp + 'Z').toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <span style={{ 
                          backgroundColor: log.action.includes('DELETE') ? '#f2dede' : '#dff0d8',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem' }}>{log.entity_id || '-'}</td>
                      <td style={{ padding: '0.5rem' }}>{log.details}</td>
                      <td style={{ padding: '0.5rem', color: '#999', fontFamily: 'monospace' }}>{log.user_info}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-cancel">Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogModal;
