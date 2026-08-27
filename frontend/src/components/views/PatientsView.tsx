import React, { useState, useEffect, useRef } from 'react';
import { Patient } from '../../types';
import { formatDate } from '../../utils';
import {
  Eye,
  Trash2,
  FileJson,
  FileText,
  PlusCircle,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Star,
  ListFilter,
  ArrowUp,
  ArrowDown,
  History
} from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { exportToJSON, exportToPDF } from '../../services/exportService';
import { SortField } from '../../hooks/usePatients';

interface PatientsViewProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onNewPatient: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
  loading: boolean;
  paginatedPatients: Patient[];
  toggleSort: (field: SortField) => void;
  setSort: (field: SortField, direction: 'asc' | 'desc') => void;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  renderSortIcon: (field: SortField) => React.ReactNode;
  onViewDetail: (id: number) => void;
  onViewHistory: (patient: Patient) => void;
  onDeletePatient: (patient: Patient) => void;
  onToggleFavorite: (patient: Patient) => void;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const PatientsView: React.FC<PatientsViewProps> = ({
  searchTerm, setSearchTerm, onSearch, onNewPatient, onImportJson,
  error, loading, paginatedPatients, toggleSort, setSort, sortField, sortDirection, renderSortIcon,
  onViewDetail, onViewHistory, onDeletePatient, onToggleFavorite, currentPage, totalPages, setCurrentPage,
  fetchWithAuth
}) => {
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (patient: Patient, type: 'pdf' | 'json') => {
    setOpenDropdownId(null);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/patients/${patient.id}`);
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

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Não disponível';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return dateStr;
    }
  };

  const SortOption = ({ field, label }: { field: SortField, label: string }) => (
    <div className="sort-dropdown-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', gap: '1rem' }}>
      <span style={{ fontSize: '0.9rem', fontWeight: sortField === field ? '600' : 'normal', color: sortField === field ? 'var(--unimed-green)' : 'inherit' }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: '0.2rem' }}>
        <button
          className={`btn-icon-small ${sortField === field && sortDirection === 'asc' ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setSort(field, 'asc'); setIsSortDropdownOpen(false); }}
          title="Ordem Ascendente"
        >
          <ArrowUp size={14} />
        </button>
        <button
          className={`btn-icon-small ${sortField === field && sortDirection === 'desc' ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setSort(field, 'desc'); setIsSortDropdownOpen(false); }}
          title="Ordem Descendente"
        >
          <ArrowDown size={14} />
        </button>
      </div>
    </div>
  );

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
            className="btn-primary btn-with-icon"
            onClick={onNewPatient}
          >
            <PlusCircle size={20} />
            <span>Novo Paciente</span>
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
        <div style={{ overflowX: 'auto', marginBottom: '1rem', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--unimed-border)' }}>
                <th
                  style={{ padding: '1rem', cursor: 'pointer' }}
                  onClick={() => toggleSort('name')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Nome {renderSortIcon('name')}
                  </div>
                </th>
                <th
                  style={{ padding: '1rem', cursor: 'pointer' }}
                  onClick={() => toggleSort('last_eval')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Última Entrada {renderSortIcon('last_eval')}
                  </div>
                </th>
                <th style={{ padding: '1rem' }}>Diagnóstico</th>
                <th
                  style={{ padding: '1rem', cursor: 'pointer' }}
                  onClick={() => toggleSort('updated_at')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Última Modificação {renderSortIcon('updated_at')}
                  </div>
                </th>
                <th
                  style={{ padding: '1rem', textAlign: 'right', position: 'relative' }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', cursor: 'pointer' }}
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  >
                    <ListFilter size={18} /> Classificação
                  </div>

                  {isSortDropdownOpen && (
                    <div className="dropdown-menu sort-dropdown" ref={sortDropdownRef} style={{ display: 'block', top: '100%', right: 0, textAlign: 'left' }}>
                      <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--unimed-border)', fontWeight: 'bold', fontSize: '0.8rem', color: '#666' }}>
                        ORDENAR POR
                      </div>
                      <SortOption field="name" label="Nome" />
                      <SortOption field="is_favorite" label="Favoritos" />
                      <SortOption field="last_eval" label="Última Entrada" />
                      <SortOption field="updated_at" label="Última Modificação" />
                    </div>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.map(p => (
                <tr
                  key={p.id}
                  className={`patient-row ${p.is_favorite ? 'favorite' : ''}`}
                  style={{ borderBottom: '1px solid var(--unimed-border)' }}
                  onDoubleClick={() => p.id && onViewDetail(p.id)}
                >
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {p.name}
                      {p.is_favorite && <Star size={14} fill="var(--unimed-orange)" color="var(--unimed-orange)" />}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>{p.evaluations?.[0] ? formatDate(p.evaluations[0].evaluation_date) : 'Sem avaliação'}</td>
                  <td style={{ padding: '1rem' }}>
                    {p.evaluations?.[0]?.medical_diagnosis
                      ? (p.evaluations[0].medical_diagnosis.length > 30
                          ? p.evaluations[0].medical_diagnosis.substring(0, 30) + '...'
                          : p.evaluations[0].medical_diagnosis)
                      : 'Não informado'}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#666' }}>
                    {formatDateTime(p.updated_at)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div className="actions-cell">
                      <button
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); p.id && onViewDetail(p.id); }}
                        title="Ver Prontuário"
                      >
                        <Eye size={18} />
                      </button>

                      <button
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); onViewHistory(p); }}
                        title="Histórico de Sessões"
                        style={{ color: 'var(--unimed-green)' }}
                      >
                        <History size={18} />
                      </button>

                      <button
                        className={`btn-icon favorite-toggle ${p.is_favorite ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(p); }}
                        title={p.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      >
                        <Star size={18} fill={p.is_favorite ? "var(--unimed-orange)" : "none"} color={p.is_favorite ? "var(--unimed-orange)" : "currentColor"} />
                      </button>

                      <div className={`dropdown ${openDropdownId === p.id ? 'open' : ''}`} ref={openDropdownId === p.id ? dropdownRef : null} onClick={(e) => e.stopPropagation()}>
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
        </div>
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
