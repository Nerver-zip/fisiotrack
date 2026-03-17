import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { Patient, Evaluation } from './types';
import { formatDate } from './utils';
import ConfirmationModal from './components/modals/ConfirmationModal';
import PatientDetailModal from './components/modals/PatientDetailModal';
import PatientFormModal from './components/modals/PatientFormModal';
import EvaluationFormModal from './components/modals/EvaluationFormModal';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para Ordenação
  const [sortField, setSortField] = useState<'name' | 'last_eval'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Estados para os Modais
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const fetchPatients = async (query: string = '') => {
    try {
      setLoading(true);
      const url = query 
        ? `http://localhost:8080/api/patients?q=${encodeURIComponent(query)}`
        : `http://localhost:8080/api/patients`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha ao buscar pacientes');
      const data = await response.json();
      setPatients(data);
      setError(null);
    } catch (err) {
      setError('Erro ao conectar com o servidor.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientWithHistory = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8080/api/patients/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedPatient(data);
        setIsDetailModalOpen(true);
      }
    } catch (err) {
      alert('Erro ao carregar prontuário');
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchTerm);
  };

  // Lógica de Ordenação
  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => {
      let valA: string = '';
      let valB: string = '';

      if (sortField === 'name') {
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
      } else if (sortField === 'last_eval') {
        valA = a.evaluations?.[0]?.evaluation_date || '0000-00-00';
        valB = b.evaluations?.[0]?.evaluation_date || '0000-00-00';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [patients, sortField, sortDirection]);

  const toggleSort = (field: 'name' | 'last_eval') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: 'name' | 'last_eval') => {
    if (sortField !== field) return <span className="sort-icon">↕</span>;
    return sortDirection === 'asc' ? <span className="sort-icon active">↑</span> : <span className="sort-icon active">↓</span>;
  };

  const savePatient = async (patient: Patient) => {
    try {
      const response = await fetch('http://localhost:8080/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient)
      });
      if (response.ok) {
        setIsFormModalOpen(false);
        fetchPatients();
      }
    } catch (err) {
      alert('Erro ao salvar paciente');
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        
        const response = await fetch('http://localhost:8080/api/patients/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          const result = await response.json();
          alert(`Importação concluída!\nProcessados: ${result.total_processed}\nNovos: ${result.imported_new}`);
          fetchPatients();
        } else {
          const err = await response.json();
          alert('Erro na importação: ' + (err.error || 'Erro desconhecido'));
        }
      } catch (err) {
        alert('Erro ao processar arquivo JSON');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const saveEvaluation = async (evaluation: Evaluation) => {
    try {
      const response = await fetch(`http://localhost:8080/api/patients/${evaluation.patient_id}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evaluation)
      });
      if (response.ok) {
        setIsEvalModalOpen(false);
        if (selectedPatient?.id) fetchPatientWithHistory(selectedPatient.id);
      }
    } catch (err) {
      alert('Erro ao salvar avaliação');
    }
  };

  const confirmDelete = async () => {
    if (!selectedPatient || !selectedPatient.id) return;
    try {
      const response = await fetch(`http://localhost:8080/api/patients/${selectedPatient.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setIsDeleteModalOpen(false);
        setSelectedPatient(null);
        fetchPatients(searchTerm);
      }
    } catch (err) {
      alert('Erro ao excluir paciente');
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Fisio<span className="logo-unimed">Track</span></h1>
        <div className="user-info">
          <span>Dr. Fisioterapeuta</span>
        </div>
      </header>

      <main className="main-content">
        <div className="card">
          <form className="search-bar" onSubmit={handleSearch}>
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
                className="btn-primary btn-new-patient" 
                onClick={() => setIsFormModalOpen(true)}
              >
                + Novo Paciente
              </button>
              <label className="btn-primary btn-import">
                { '{ }' } Importar JSON
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportJson} 
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
                    style={{ padding: '1rem', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleSort('name')}
                  >
                    Nome {renderSortIcon('name')}
                  </th>
                  <th 
                    style={{ padding: '1rem', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleSort('last_eval')}
                  >
                    Última Entrada {renderSortIcon('last_eval')}
                  </th>
                  <th style={{ padding: '1rem' }}>Diagnóstico</th>
                  <th style={{ padding: '1rem' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedPatients.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--unimed-border)' }}>
                    <td style={{ padding: '1rem' }}>{p.name}</td>
                    <td style={{ padding: '1rem' }}>{p.evaluations?.[0] ? formatDate(p.evaluations[0].evaluation_date) : 'Sem avaliação'}</td>
                    <td style={{ padding: '1rem' }}>{p.evaluations?.[0]?.medical_diagnosis || 'Não informado'}</td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => p.id && fetchPatientWithHistory(p.id)}
                        style={{ color: 'var(--unimed-green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Ver Prontuário
                      </button>
                      <button 
                        onClick={() => { setSelectedPatient(p); setIsDeleteModalOpen(true); }}
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
        </div>
      </main>

      <PatientFormModal 
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={savePatient}
      />

      <EvaluationFormModal 
        isOpen={isEvalModalOpen}
        patientId={selectedPatient?.id || null}
        patientBirthDate={selectedPatient?.birth_date || ''}
        onClose={() => setIsEvalModalOpen(false)}
        onSave={saveEvaluation}
      />

      <PatientDetailModal 
        isOpen={isDetailModalOpen}
        patient={selectedPatient}
        onClose={() => setIsDetailModalOpen(false)}
        onAddEvaluation={() => { setIsDetailModalOpen(false); setIsEvalModalOpen(true); }}
      />

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        title="Excluir Paciente"
        message={`Tem certeza que deseja excluir permanentemente o cadastro de ${selectedPatient?.name}? Todos o histórico de entradas será perdido.`}
        confirmText="Excluir"
        cancelText="Voltar"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}

export default App;
