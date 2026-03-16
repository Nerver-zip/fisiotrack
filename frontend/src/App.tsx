import React, { useState, useEffect } from 'react';
import './App.css';
import { Patient, Evaluation } from './types';
import ConfirmationModal from './components/modals/ConfirmationModal';
import PatientDetailModal from './components/modals/PatientDetailModal';
import PatientFormModal from './components/modals/PatientFormModal';
import EvaluationFormModal from './components/modals/EvaluationFormModal';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <input 
              type="text" 
              placeholder="Buscar paciente por nome..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="btn-primary">Buscar</button>
            <button 
              type="button" 
              className="btn-primary" 
              style={{ backgroundColor: 'var(--unimed-dark-green)' }}
              onClick={() => setIsFormModalOpen(true)}
            >
              + Novo Paciente
            </button>
          </form>

          {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

          {loading ? (
            <p>Carregando pacientes...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--unimed-border)' }}>
                  <th style={{ padding: '1rem' }}>ID Convênio</th>
                  <th style={{ padding: '1rem' }}>Nome</th>
                  <th style={{ padding: '1rem' }}>CPF</th>
                  <th style={{ padding: '1rem' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--unimed-border)' }}>
                    <td style={{ padding: '1rem' }}>{p.healthcare_id}</td>
                    <td style={{ padding: '1rem' }}>{p.name}</td>
                    <td style={{ padding: '1rem' }}>{p.cpf}</td>
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
