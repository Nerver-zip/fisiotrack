import React, { useState } from 'react';
import './App.css';
import ConfirmationModal from './components/modals/ConfirmationModal';
import PatientDetailModal from './components/modals/PatientDetailModal';
import PatientFormModal from './components/modals/PatientFormModal';
import EvaluationFormModal from './components/modals/EvaluationFormModal';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import AuditLogView from './components/views/AuditLogView';
import PatientsView from './components/views/PatientsView';

// Custom Hooks
import { useAuth } from './hooks/useAuth';
import { usePatients } from './hooks/usePatients';
import { useModals } from './hooks/useModals';
import { useSync } from './hooks/useSync';

function App() {
  const {
    token, isInitialized, loginPassword, setLoginPassword,
    confirmPassword, setConfirmPassword, loginError,
    syncStatus, setSyncStatus, handleLogin, handleSetup,
    handleLogout, fetchWithAuth
  } = useAuth();

  const {
    loading, error, searchTerm, setSearchTerm,
    currentPage, setCurrentPage, totalPages,
    paginatedPatients, toggleSort, setSort, sortField, sortDirection, renderSortIcon,
    fetchPatients, toggleFavorite
  } = usePatients({ token, fetchWithAuth });

  const { modals, data, actions } = useModals({ 
    fetchWithAuth, 
    refreshPatients: fetchPatients, 
    searchTerm 
  });

  const { handleBackup } = useSync({ token, syncStatus, setSyncStatus, fetchWithAuth });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pacientes');

  const safeLogout = async () => {
    if (syncStatus === 'pendente' || syncStatus === 'erro') {
      await handleBackup();
    }
    handleLogout();
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const jsonData = JSON.parse(content);
        const response = await fetchWithAuth('http://localhost:8080/api/patients/import', {
          method: 'POST',
          body: JSON.stringify(jsonData)
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

  if (!token) {
    const isSetupMode = isInitialized === false;
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--unimed-bg)' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <img src="/assets/logo.jpg" alt="FisioTrack" className="logo-app" />
          {isSetupMode ? (
            <form onSubmit={handleSetup}>
              <h2 style={{ color: 'var(--unimed-green)', marginBottom: '0.5rem' }}>Configuração Inicial</h2>
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                <label htmlFor="setup-password">Definir Senha Mestre</label>
                <input id="setup-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Mínimo 6 caracteres" autoFocus />
              </div>
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <label htmlFor="confirm-password">Confirmar Senha</label>
                <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
              </div>
              {loginError && <p style={{ color: '#d9534f', marginBottom: '1rem' }}>{loginError}</p>}
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Criar Banco Criptografado</button>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <label htmlFor="login-password">Senha de Acesso</label>
                <input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Digite sua senha master" autoFocus />
              </div>
              {loginError && <p style={{ color: '#d9534f', marginBottom: '1rem' }}>{loginError}</p>}
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Entrar</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar onMenuClick={() => setIsSidebarOpen(true)} syncStatus={syncStatus} onSyncClick={syncStatus === 'erro' ? handleBackup : undefined} activeTab={activeTab} onTabChange={setActiveTab} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} userName="Dr. Fisioterapeuta" onAuditClick={() => setActiveTab('auditoria')} onLogoutClick={safeLogout} />
      <main className="main-content">
        {activeTab === 'pacientes' && (
          <PatientsView 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            onSearch={(e) => { e.preventDefault(); setCurrentPage(1); fetchPatients(searchTerm); }}
            onNewPatient={() => { data.setPatientToEdit(null); modals.setIsFormModalOpen(true); }}
            onImportJson={handleImportJson}
            error={error}
            loading={loading}
            paginatedPatients={paginatedPatients}
            toggleSort={toggleSort}
            setSort={setSort}
            sortField={sortField}
            sortDirection={sortDirection}
            renderSortIcon={renderSortIcon}
            onViewDetail={actions.fetchPatientWithHistory}
            onDeletePatient={(p) => { data.setSelectedPatient(p); modals.setIsDeleteModalOpen(true); }}
            onToggleFavorite={toggleFavorite}
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            fetchWithAuth={fetchWithAuth}
          />
        )}
        {activeTab === 'agenda' && <div className="card"><h2>Agenda</h2><p>Em breve: Gestão de consultas e notificações.</p></div>}
        {activeTab === 'estatisticas' && <div className="card"><h2>Estatísticas</h2><p>Em breve: Diagnósticos frequentes, carga da agenda e correlações.</p></div>}
        {activeTab === 'auditoria' && <AuditLogView fetchWithAuth={fetchWithAuth} />}
      </main>

      <PatientFormModal 
        isOpen={modals.isFormModalOpen} 
        onClose={() => { 
          modals.setIsFormModalOpen(false); 
          if (data.patientToEdit && data.selectedPatient) modals.setIsDetailModalOpen(true); 
          data.setPatientToEdit(null); 
        }} 
        onSave={actions.savePatient} 
        patientToEdit={data.patientToEdit} 
      />
      
      <EvaluationFormModal 
        isOpen={modals.isEvalModalOpen} 
        patientId={data.selectedPatient?.id || null} 
        patientBirthDate={data.selectedPatient?.birth_date || ''} 
        onClose={() => { 
          modals.setIsEvalModalOpen(false); 
          if (data.evaluationToEdit && data.selectedPatient) modals.setIsDetailModalOpen(true); 
          data.setEvaluationToEdit(null); 
        }} 
        onSave={actions.saveEvaluation} 
        evaluationToEdit={data.evaluationToEdit} 
      />

      <PatientDetailModal 
        isOpen={modals.isDetailModalOpen} 
        patient={data.selectedPatient} 
        onClose={() => modals.setIsDetailModalOpen(false)} 
        onAddEvaluation={() => { 
          modals.setIsDetailModalOpen(false); 
          data.setEvaluationToEdit(null); 
          modals.setIsEvalModalOpen(true); 
        }} 
        onEditPatient={(p) => { 
          modals.setIsDetailModalOpen(false); 
          data.setPatientToEdit(p); 
          modals.setIsFormModalOpen(true); 
        }} 
        onEditEvaluation={(e) => { 
          modals.setIsDetailModalOpen(false); 
          data.setEvaluationToEdit(e); 
          modals.setIsEvalModalOpen(true); 
        }} 
        onDeleteEvaluation={(e) => { 
          data.setEvaluationToDelete(e); 
          modals.setIsDeleteEvalModalOpen(true); 
        }} 
      />

      <ConfirmationModal 
        isOpen={modals.isDeleteModalOpen} 
        title="Excluir Paciente" 
        message={`Tem certeza que deseja excluir permanentemente o cadastro de ${data.selectedPatient?.name}?`} 
        confirmText="Excluir" 
        cancelText="Voltar" 
        onConfirm={actions.confirmDelete} 
        onCancel={() => modals.setIsDeleteModalOpen(false)} 
      />

      <ConfirmationModal 
        isOpen={modals.isDeleteEvalModalOpen} 
        title="Excluir Entrada Clínica" 
        message={`Tem certeza que deseja excluir esta entrada?`} 
        confirmText="Excluir" 
        cancelText="Voltar" 
        onConfirm={actions.confirmDeleteEvaluation} 
        onCancel={() => modals.setIsDeleteEvalModalOpen(false)} 
      />
    </div>
  );
}

export default App;
