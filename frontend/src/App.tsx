import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autenticação e Timeout
  const [token, setToken] = useState<string | null>(localStorage.getItem('fisio_token'));
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Estados para Ordenação
  const [sortField, setSortField] = useState<'name' | 'last_eval'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Estados para os Modais
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [isDeleteEvalModalOpen, setIsDeleteEvalModalOpen] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [evaluationToEdit, setEvaluationToEdit] = useState<Evaluation | null>(null);
  const [evaluationToDelete, setEvaluationToDelete] = useState<Evaluation | null>(null);

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 && token) {
      handleLogout();
      throw new Error('Sessão expirada');
    }
    return res;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8080/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        localStorage.setItem('fisio_token', data.token);
        setLoginError(null);
      } else {
        setLoginError('Senha incorreta.');
      }
    } catch (err) {
      setLoginError('Erro ao conectar com o servidor.');
    }
  };

  const handleLogout = () => {
    fetchWithAuth('http://localhost:8080/api/logout', { method: 'POST' }).catch(() => {});
    setToken(null);
    localStorage.removeItem('fisio_token');
    setPatients([]);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  };

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (token) {
      idleTimerRef.current = setTimeout(() => {
        handleLogout();
        alert('Sessão expirada por inatividade. Por favor, faça login novamente.');
      }, IDLE_TIMEOUT_MS);
    }
  };

  useEffect(() => {
    if (!token) return;

    resetIdleTimer();

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    const handleActivity = () => resetIdleTimer();

    events.forEach(e => window.addEventListener(e, handleActivity));
    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [token]);

  const fetchPatients = async (query: string = '') => {
    if (!token) return;
    try {
      setLoading(true);
      const url = query 
        ? `http://localhost:8080/api/patients?q=${encodeURIComponent(query)}`
        : `http://localhost:8080/api/patients`;
      
      const response = await fetchWithAuth(url);
      if (!response.ok) throw new Error('Falha ao buscar pacientes');
      const data = await response.json();
      setPatients(data);
      setError(null);
    } catch (err) {
      if (token) setError('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientWithHistory = async (id: number) => {
    try {
      const response = await fetchWithAuth(`http://localhost:8080/api/patients/${id}`);
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
    if (token) fetchPatients();
  }, [token]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchTerm);
  };

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
      const isEdit = !!patient.id;
      const url = isEdit 
        ? `http://localhost:8080/api/patients/${patient.id}`
        : 'http://localhost:8080/api/patients';
      
      const response = await fetchWithAuth(url, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(patient)
      });

      if (response.ok) {
        setIsFormModalOpen(false);
        setPatientToEdit(null);
        fetchPatients(searchTerm);
        if (isEdit && patient.id && selectedPatient?.id === patient.id) {
          fetchPatientWithHistory(patient.id);
        }
      } else {
        alert('Erro ao salvar dados do paciente');
      }
    } catch (err) {
      alert('Erro de conexão com o servidor');
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
        
        const response = await fetchWithAuth('http://localhost:8080/api/patients/import', {
          method: 'POST',
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
    e.target.value = '';
  };

  const saveEvaluation = async (evaluation: Evaluation) => {
    try {
      const isEdit = !!evaluation.id;
      const url = isEdit
        ? `http://localhost:8080/api/patients/${evaluation.patient_id}/evaluations/${evaluation.id}`
        : `http://localhost:8080/api/patients/${evaluation.patient_id}/evaluations`;

      const response = await fetchWithAuth(url, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(evaluation)
      });

      if (response.ok) {
        setIsEvalModalOpen(false);
        setEvaluationToEdit(null);
        if (selectedPatient?.id) fetchPatientWithHistory(selectedPatient.id);
        fetchPatients(searchTerm);
      } else {
        alert('Erro ao salvar avaliação');
      }
    } catch (err) {
      alert('Erro de conexão com o servidor');
    }
  };

  const confirmDelete = async () => {
    if (!selectedPatient || !selectedPatient.id) return;
    try {
      const response = await fetchWithAuth(`http://localhost:8080/api/patients/${selectedPatient.id}`, {
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

  const confirmDeleteEvaluation = async () => {
    if (!evaluationToDelete || !evaluationToDelete.id) return;
    try {
      const response = await fetchWithAuth(`http://localhost:8080/api/patients/${evaluationToDelete.patient_id}/evaluations/${evaluationToDelete.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setIsDeleteEvalModalOpen(false);
        setEvaluationToDelete(null);
        if (selectedPatient?.id) fetchPatientWithHistory(selectedPatient.id);
        fetchPatients(searchTerm);
      }
    } catch (err) {
      alert('Erro ao excluir entrada');
    }
  };

  const handleEditPatient = (patient: Patient) => {
    setIsDetailModalOpen(false);
    setPatientToEdit(patient);
    setIsFormModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
    if (patientToEdit && selectedPatient) {
      setIsDetailModalOpen(true);
    }
    setPatientToEdit(null);
  };

  const handleEditEvaluation = (evaluation: Evaluation) => {
    setIsDetailModalOpen(false);
    setEvaluationToEdit(evaluation);
    setIsEvalModalOpen(true);
  };

  const handleDeleteEvaluation = (evaluation: Evaluation) => {
    setEvaluationToDelete(evaluation);
    setIsDeleteEvalModalOpen(true);
  };

  const handleCloseEvalForm = () => {
    setIsEvalModalOpen(false);
    if (evaluationToEdit && selectedPatient) {
      setIsDetailModalOpen(true);
    }
    setEvaluationToEdit(null);
  };

  if (!token) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--unimed-bg)' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <h1 style={{ marginBottom: '2rem' }}>Fisio<span className="logo-unimed">Track</span></h1>
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <label>Senha de Acesso</label>
              <input 
                type="password" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Digite sua senha master"
                style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--unimed-border)', borderRadius: '4px' }}
                autoFocus
              />
            </div>
            {loginError && <p style={{ color: '#d9534f', marginBottom: '1rem', fontSize: '0.9rem' }}>{loginError}</p>}
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>Entrar</button>
          </form>
          <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#666' }}>
            Proteção Zero-Knowledge via SQLCipher (AES-256)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Fisio<span className="logo-unimed">Track</span></h1>
        <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Dr. Fisioterapeuta</span>
          <button onClick={handleLogout} className="btn-cancel" style={{ minWidth: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Sair</button>
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
                onClick={() => { setPatientToEdit(null); setIsFormModalOpen(true); }}
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
        onClose={handleCloseForm}
        onSave={savePatient}
        patientToEdit={patientToEdit}
      />

      <EvaluationFormModal 
        isOpen={isEvalModalOpen}
        patientId={selectedPatient?.id || null}
        patientBirthDate={selectedPatient?.birth_date || ''}
        onClose={handleCloseEvalForm}
        onSave={saveEvaluation}
        evaluationToEdit={evaluationToEdit}
      />

      <PatientDetailModal 
        isOpen={isDetailModalOpen}
        patient={selectedPatient}
        onClose={() => setIsDetailModalOpen(false)}
        onAddEvaluation={(pid) => { setIsDetailModalOpen(false); setEvaluationToEdit(null); setIsEvalModalOpen(true); }}
        onEditPatient={handleEditPatient}
        onEditEvaluation={handleEditEvaluation}
        onDeleteEvaluation={handleDeleteEvaluation}
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

      <ConfirmationModal 
        isOpen={isDeleteEvalModalOpen}
        title="Excluir Entrada Clínica"
        message={`Tem certeza que deseja excluir permanentemente esta entrada de ${formatDate(evaluationToDelete?.evaluation_date || '')}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Voltar"
        onConfirm={confirmDeleteEvaluation}
        onCancel={() => setIsDeleteEvalModalOpen(false)}
      />
    </div>
  );
}

export default App;
