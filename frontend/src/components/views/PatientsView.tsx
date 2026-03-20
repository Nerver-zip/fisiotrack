import React, { useState, useEffect, useRef } from 'react';
import { Patient } from '../../types';
import { formatDate } from '../../utils';
import { 
  Eye, 
  Trash2, 
  FileJson, 
  FileText, 
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown
} from 'lucide-react';
import { exportToJSON, exportToPDF } from '../../services/exportService';

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
  renderSortIcon: (field: 'name' | 'last_eval') => string;
  onViewDetail: (id: number) => void;
  onDeletePatient: (patient: Patient) => void;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const PatientsView: React.FC<PatientsViewProps> = ({
  searchTerm, setSearchTerm, onSearch, onNewPatient, onImportJson,
  error, loading, paginatedPatients, toggleSort, renderSortIcon,
  onViewDetail, onDeletePatient, currentPage, totalPages, setCurrentPage,
  fetchWithAuth
}) => {
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (patient: Patient, type: 'pdf' | 'json') => {
    setOpenDropdownId(null);
    try {
      // Para exportar, precisamos do histórico completo
      const response = await fetchWithAuth(`http://localhost:8080/api/patients/${patient.id}`);
      if (response.ok) {
        const fullPatient = await response.json();
        if (type === 'pdf') exportToPDF(fullPatient);
        else exportToJSON(fullPatient);
      } else {
        alert('Erro ao carregar dados para exportação');
      }
    } catch (err) {
      alert('Erro na exportação');
    }
  };

  const getSortIcon = (field: 'name' | 'last_eval') => {
    const icon = renderSortIcon(field);
    if (icon === '↑') return <ChevronUp size={16} />;
    if (icon === '↓') return <ChevronDown size={16} />;
    return <ChevronsUpDown size={16} opacity={0.3} />;
  };

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Nome {getSortIcon('name')}
                </div>
              </th>
              <th 
                style={{ padding: '1rem', cursor: 'pointer' }}
                onClick={() => toggleSort('last_eval')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Última Entrada {getSortIcon('last_eval')}
                </div>
              </th>
              <th style={{ padding: '1rem' }}>Diagnóstico</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPatients.map(p => (
              <tr 
                key={p.id} 
                className="patient-row"
                style={{ borderBottom: '1px solid var(--unimed-border)' }}
                onDoubleClick={() => p.id && onViewDetail(p.id)}
              >
                <td style={{ padding: '1rem' }}>{p.name}</td>
                <td style={{ padding: '1rem' }}>{p.evaluations?.[0] ? formatDate(p.evaluations[0].evaluation_date) : 'Sem avaliação'}</td>
                <td style={{ padding: '1rem' }}>
                  {p.evaluations?.[0]?.medical_diagnosis 
                    ? (p.evaluations[0].medical_diagnosis.length > 30 
                        ? p.evaluations[0].medical_diagnosis.substring(0, 30) + '...' 
                        : p.evaluations[0].medical_diagnosis)
                    : 'Não informado'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div className="actions-cell">
                    <button 
                      className="btn-icon" 
                      onClick={() => p.id && onViewDetail(p.id)}
                      title="Ver Prontuário"
                    >
                      <Eye size={18} />
                    </button>
                    
                    <div className={`dropdown ${openDropdownId === p.id ? 'open' : ''}`} ref={openDropdownId === p.id ? dropdownRef : null}>
                      <button 
                        className="btn-icon" 
                        onClick={() => setOpenDropdownId(openDropdownId === p.id ? null : (p.id || null))}
                        title="Mais ações"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      
                      <div className="dropdown-menu">
                        <button className="dropdown-item" onClick={() => p.id && onViewDetail(p.id)}>
                          <Eye size={16} /> Abrir Prontuário
                        </button>
                        <button className="dropdown-item" onClick={() => handleExport(p, 'pdf')}>
                          <FileText size={16} /> Exportar PDF
                        </button>
                        <button className="dropdown-item" onClick={() => handleExport(p, 'json')}>
                          <FileJson size={16} /> Exportar JSON
                        </button>
                        <div className="dropdown-divider"></div>
                        <button className="dropdown-item danger" onClick={() => { setOpenDropdownId(null); onDeletePatient(p); }}>
                          <Trash2 size={16} /> Excluir Paciente
                        </button>
                      </div>
                    </div>
                  </div>
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
