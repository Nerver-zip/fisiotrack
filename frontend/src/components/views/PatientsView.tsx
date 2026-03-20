import React from 'react';
import { Patient } from '../../types';
import { formatDate } from '../../utils';

interface PatientsViewProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onNewPatient: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
  loading: boolean;
  paginatedPatients: Patient[];
  toggleSort: (field: 'name' | 'last_eval') => void;
  renderSortIcon: (field: 'name' | 'last_eval') => React.ReactNode;
  onViewDetail: (id: number) => void;
  onDeletePatient: (patient: Patient) => void;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
}

const PatientsView: React.FC<PatientsViewProps> = ({
  searchTerm, setSearchTerm, onSearch, onNewPatient, onImportJson,
  error, loading, paginatedPatients, toggleSort, renderSortIcon,
  onViewDetail, onDeletePatient, currentPage, totalPages, setCurrentPage
}) => {
  return (
    <div className="card">
      <form className="search-bar" onSubmit={onSearch}>
        <div className="search-group">
          <input 
            type="text" 
            placeholder="Buscar paciente por nome..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="btn-primary">Buscar</button>
        </div>
        <div className="action-buttons">
          <button 
            type="button" 
            className="btn-primary" 
            onClick={onNewPatient}
          >
            + Novo Paciente
          </button>
          <label className="btn-primary btn-import">
            { '{ }' } Importar JSON
            <input 
              type="file" 
              accept=".json" 
              onChange={onImportJson} 
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </form>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <p>Carregando pacientes...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--unimed-border)' }}>
              <th 
                style={{ padding: '1rem', cursor: 'pointer' }}
                onClick={() => toggleSort('name')}
              >
                Nome <span className={`sort-icon ${renderSortIcon('name') !== '↕' ? 'active' : ''}`}>{renderSortIcon('name')}</span>
              </th>
              <th 
                style={{ padding: '1rem', cursor: 'pointer' }}
                onClick={() => toggleSort('last_eval')}
              >
                Última Entrada <span className={`sort-icon ${renderSortIcon('last_eval') !== '↕' ? 'active' : ''}`}>{renderSortIcon('last_eval')}</span>
              </th>
              <th style={{ padding: '1rem' }}>Diagnóstico</th>
              <th style={{ padding: '1rem' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPatients.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--unimed-border)' }}>
                <td style={{ padding: '1rem' }}>{p.name}</td>
                <td style={{ padding: '1rem' }}>{p.evaluations?.[0] ? formatDate(p.evaluations[0].evaluation_date) : 'Sem avaliação'}</td>
                <td style={{ padding: '1rem' }}>
                  {p.evaluations?.[0]?.medical_diagnosis 
                    ? (p.evaluations[0].medical_diagnosis.length > 30 
                        ? p.evaluations[0].medical_diagnosis.substring(0, 30) + '...' 
                        : p.evaluations[0].medical_diagnosis)
                    : 'Não informado'}
                </td>
                <td style={{ padding: '1rem', display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => p.id && onViewDetail(p.id)}
                    style={{ color: 'var(--unimed-green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Ver Prontuário
                  </button>
                  <button 
                    onClick={() => onDeletePatient(p)}
                    style={{ color: '#d9534f', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, (p as number) - 1))}
            disabled={currentPage === 1}
            className="btn-page"
          >
            &laquo; Anterior
          </button>
          
          <div className="page-info">
            Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
          </div>

          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, (p as number) + 1))}
            disabled={currentPage === totalPages}
            className="btn-page"
          >
            Próxima &raquo;
          </button>
        </div>
      )}
    </div>
  );
};

export default PatientsView;
