import React, { useEffect, useState } from 'react';
import { formatDate } from '../../utils';
import { API_BASE_URL } from '../../config';

interface AuditEntry {
  id: number;
  timestamp: string;
  action: string;
  entity_id: number;
  details: string;
  user_info: string;
}

interface AuditLogViewProps {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuditLogView: React.FC<AuditLogViewProps> = ({ fetchWithAuth }) => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
        setLoading(true);
        try {
          const res = await fetchWithAuth(`${API_BASE_URL}/api/audit`);
          if (res.ok && isMounted) {
            const data = await res.json();
            setLogs(data);
          }
        } catch (err) {
          console.error('Erro ao carregar logs', err);
        } finally {
          if (isMounted) setLoading(false);
        }
    };
    loadInitial();
    return () => { isMounted = false; };
  }, [fetchWithAuth]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/audit`);
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

  return (
    <div className="card">
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Registro de Auditoria (Últimas 100 ações)</h2>
        <button onClick={loadLogs} className="btn-primary" style={{ minWidth: 'auto' }}>Atualizar</button>
      </div>
      
      <div className="view-body" style={{ overflowX: 'auto' }}>
        {loading ? (
          <p>Carregando registros...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', color: '#666' }}>
                <th style={{ padding: '1rem' }}>Data/Hora</th>
                <th style={{ padding: '1rem' }}>Ação</th>
                <th style={{ padding: '1rem' }}>ID Entidade</th>
                <th style={{ padding: '1rem' }}>Detalhes</th>
                <th style={{ padding: '1rem' }}>Sessão</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>Nenhum registro encontrado.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>{new Date(log.timestamp + 'Z').toLocaleString('pt-BR', { hour12: false })}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        backgroundColor: log.action.includes('DELETE') ? '#f2dede' : '#dff0d8',
                        color: log.action.includes('DELETE') ? '#a94442' : '#3c763d',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>{log.entity_id || '-'}</td>
                    <td style={{ padding: '1rem' }}>{log.details}</td>
                    <td style={{ padding: '1rem', color: '#999', fontFamily: 'monospace' }}>{log.user_info}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AuditLogView;
