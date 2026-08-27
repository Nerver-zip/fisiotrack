import React, { useState } from 'react';
import './App.css';
import ConfirmationModal from './components/modals/ConfirmationModal';
import PatientDetailModal from './components/modals/PatientDetailModal';
import PatientFormModal from './components/modals/PatientFormModal';
import EvaluationFormModal from './components/modals/EvaluationFormModal';
import SessionHistoryModal from './components/modals/SessionHistoryModal';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import AuditLogView from './components/views/AuditLogView';
import PatientsView from './components/views/PatientsView';
import AgendaView from './components/views/AgendaView';
import BackupConfigView from './components/views/BackupConfigView';
import SuccessModal from './components/modals/SuccessModal';
import ExportModal from './components/modals/ExportModal';
import AppointmentFormModal from './components/modals/AppointmentFormModal';
import { API_BASE_URL } from './config';
import { exportPatientsToJSON } from './services/exportService';

// Custom Hooks
import { useAuth } from './hooks/useAuth';
import { usePatients } from './hooks/usePatients';
import { useAppointments } from './hooks/useAppointments';
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
    loading: patientsLoading, error: patientsError, searchTerm, setSearchTerm,
    currentPage, setCurrentPage, totalPages,
    paginatedPatients, toggleSort, setSort, sortField, sortDirection, renderSortIcon,
    fetchPatients, toggleFavorite, patients
  } = usePatients({ token, fetchWithAuth });

  const {
    appointments, loading: agendaLoading, error: agendaError, currentDate, setCurrentDate,
    addAppointment, updateAppointment, deleteAppointment, checkConflicts
  } = useAppointments({ token, fetchWithAuth });

  const { modals, data, actions } = useModals({
    fetchWithAuth,
    refreshPatients: fetchPatients,
    searchTerm
  });

  const { handleBackup } = useSync({ token, syncStatus, setSyncStatus, fetchWithAuth });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pacientes');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [patientForHistory, setPatientForHistory] = useState<any>(null);
  const [returnToHistory, setReturnToHistory] = useState(false);
  const [backupRefreshKey, setBackupRefreshKey] = useState(0);
  const processedOAuthRef = React.useRef(false);

  // Detectar e processar callback do Google OAuth 2.0
  React.useEffect(() => {
    if (processedOAuthRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code && token) {
        processedOAuthRef.current = true;
        processOAuthCode(code);
    }
  }, [token]);

  const processOAuthCode = async (code: string) => {
    setActiveTab('ajustes');
    console.log('Iniciando processamento do código OAuth:', code);
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/api/backup/auth/callback`, {
            method: 'POST',
            body: JSON.stringify({ code })
        });

        if (response.ok) {
            setBackupRefreshKey(prev => prev + 1);
            setIsSuccessModalOpen(true);
        } else {
            const errData = await response.json().catch(() => ({ error: 'Resposta inválida do servidor' }));
            console.error('Erro retornado pelo backend:', errData);
            alert('Erro ao conectar Google Drive: ' + (errData.error || response.statusText));
        }
    } catch (err) {
        console.error('Erro crítico na conexão OAuth:', err);
        alert(`Erro de conexão ao processar autorização. Verifique se o backend está rodando em ${API_BASE_URL}`);
    } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const safeLogout = async () => {
    if (syncStatus === 'pendente' || syncStatus === 'erro') {
      await handleBackup();
    }
    handleLogout();
  };

  const handleExportJson = async (selectedIds: number[]) => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/patients/export`);
      if (response.ok) {
        const allFullPatients = await response.json();
        const selectedPatients = allFullPatients.filter((p: any) => selectedIds.includes(p.id));
        exportPatientsToJSON(selectedPatients);
      } else {
        alert('Erro ao buscar dados para exportação');
      }
    } catch (err) {
      alert('Erro de conexão ao exportar');
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const jsonData = JSON.parse(content);
        const response = await fetchWithAuth(`${API_BASE_URL}/api/patients/import`, {
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
              <p style={{ marginBottom: '1rem' }}>Defina a senha mestre desta clínica.</p>
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                <label htmlFor="setup-password">Definir Senha Mestre</label>
                <input id="setup-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Mínimo 8 caracteres (A, a, 1)" autoFocus />
              </div>
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                <label htmlFor="confirm-password">Confirmar Senha</label>
                <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
              </div>
              {loginError && <p style={{ color: '#d9534f', marginBottom: '1rem' }}>{loginError}</p>}
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Concluir Configuração</button>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <h2 style={{ color: 'var(--unimed-green)', marginBottom: '1.5rem' }}>Acesso à Clínica</h2>
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <label htmlFor="login-password">Senha de Acesso</label>
                <input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Digite a senha mestre" autoFocus />
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
      <Navbar
        onMenuClick={() => setIsSidebarOpen(true)}
        syncStatus={syncStatus}
        onSyncClick={handleBackup}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userName="Equipe da Clínica"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAuditClick={() => setActiveTab('auditoria')}
        onBackupConfigClick={() => setActiveTab('ajustes')}
        onExportClick={() => modals.setIsExportModalOpen(true)}
        onLogoutClick={safeLogout}
      />
      <main className="main-content">
        {activeTab === 'pacientes' && (
          <PatientsView
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onSearch={(e) => { e.preventDefault(); fetchPatients(searchTerm); }}
            onNewPatient={() => { data.setPatientToEdit(null); modals.setIsFormModalOpen(true); }}
            onImportJson={handleImportJson}
            error={patientsError}
            loading={patientsLoading}
            paginatedPatients={paginatedPatients}
            toggleSort={toggleSort}
            setSort={setSort}
            sortField={sortField}
            sortDirection={sortDirection}
            renderSortIcon={renderSortIcon}
            onViewDetail={(id) => actions.fetchPatientWithHistory(id)}
            onViewHistory={(patient) => { setPatientForHistory(patient); setIsHistoryModalOpen(true); }}
            onDeletePatient={(patient) => { data.setSelectedPatient(patient); modals.setIsDeleteModalOpen(true); }}
            onToggleFavorite={toggleFavorite}
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            fetchWithAuth={fetchWithAuth}
          />

        )}
        {activeTab === 'agenda' && (
          <AgendaView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            appointments={appointments}
            loading={agendaLoading}
            error={agendaError}
            onNewAppointment={() => { data.setApptToEdit(null); modals.setIsApptModalOpen(true); }}
            onEditAppointment={(appt) => { data.setApptToEdit(appt); modals.setIsApptModalOpen(true); }}
            onDeleteAppointment={(appt) => { data.setApptToDelete(appt); modals.setIsDeleteApptModalOpen(true); }}
            checkConflicts={checkConflicts}
          />
        )}
        {activeTab === 'estatisticas' && <div className="card"><h2>Estatísticas</h2><p>Em breve: Diagnósticos frequentes, carga da agenda e correlações.</p></div>}
        {activeTab === 'auditoria' && <AuditLogView fetchWithAuth={fetchWithAuth} />}
        {activeTab === 'ajustes' && <BackupConfigView key={backupRefreshKey} fetchWithAuth={fetchWithAuth} />}
      </main>
<SuccessModal
  isOpen={isSuccessModalOpen}
  onClose={() => setIsSuccessModalOpen(false)}
  title="Google Drive Conectado!"
  message="Sua conta foi vinculada com sucesso. Agora você pode definir uma pasta específica para seus backups ou usar a raiz do Drive."
  buttonText="Configurar Pasta de Backup"
/>

<ExportModal
  isOpen={modals.isExportModalOpen}
  onClose={() => modals.setIsExportModalOpen(false)}
  patients={patientsLoading ? [] : (Array.isArray(patients) ? patients : [])}
  onExport={handleExportJson}
/>

      <AppointmentFormModal
        isOpen={modals.isApptModalOpen}
        onClose={() => {
          modals.setIsApptModalOpen(false);
          data.setApptToEdit(null);
          if (returnToHistory) {
            setIsHistoryModalOpen(true);
            setReturnToHistory(false);
          }
        }}
        onSave={async (appt) => {
          const success = appt.id
            ? await updateAppointment(appt)
            : await addAppointment(appt);
          if (success) {
            modals.setIsApptModalOpen(false);
            data.setApptToEdit(null);
            fetchPatients(); // Atualiza contadores
            if (returnToHistory) {
              setIsHistoryModalOpen(true);
              setReturnToHistory(false);
            }
          }
        }}
        apptToEdit={data.apptToEdit}

        currentDate={currentDate}
        fetchWithAuth={fetchWithAuth}
        checkConflicts={checkConflicts}
      />

      <ConfirmationModal
        isOpen={modals.isDeleteApptModalOpen}
        onCancel={() => { modals.setIsDeleteApptModalOpen(false); data.setApptToDelete(null); }}
        onConfirm={async () => {
          if (data.apptToDelete?.id) {
            const success = await deleteAppointment(data.apptToDelete.id);
            if (success) {
              modals.setIsDeleteApptModalOpen(false);
              data.setApptToDelete(null);
            }
          }
        }}
        title="Excluir Agendamento"
        message={`Tem certeza que deseja excluir o agendamento de ${data.apptToDelete?.patient_name} às ${data.apptToDelete?.appointment_time}?`}
      />

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

      <SessionHistoryModal
        isOpen={isHistoryModalOpen}
        patient={patientForHistory}
        onClose={() => { setIsHistoryModalOpen(false); setPatientForHistory(null); }}
        onEditSession={(appt) => {
          setIsHistoryModalOpen(false);
          setReturnToHistory(true);
          data.setApptToEdit(appt);
          modals.setIsApptModalOpen(true);
        }}
        onNewAppointment={(patient) => {
          setIsHistoryModalOpen(false);
          setReturnToHistory(true);
          data.setApptToEdit(null); // Garantir que é um novo
          // O AppointmentFormModal usa searchTerm e formData para o nome.
          // Mas ele também observa o apptToEdit.
          // Vamos setar um agendamento vazio apenas com os dados do paciente.
          data.setApptToEdit({
            patient_id: patient.id,
            patient_name: patient.name,
            appointment_date: currentDate,
            appointment_time: '09:00',
            duration_minutes: 30,
            notes: '',
            status: 'scheduled'
          } as any);
          modals.setIsApptModalOpen(true);
        }}
        fetchWithAuth={fetchWithAuth}
        refreshPatientData={fetchPatients}
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
