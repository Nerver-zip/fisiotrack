import { useState, useCallback } from 'react';
import { Patient, Evaluation } from '../types';

interface UseModalsProps {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  refreshPatients: (query?: string) => Promise<void>;
  searchTerm: string;
}

export function useModals({ fetchWithAuth, refreshPatients, searchTerm }: UseModalsProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [isDeleteEvalModalOpen, setIsDeleteEvalModalOpen] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [evaluationToEdit, setEvaluationToEdit] = useState<Evaluation | null>(null);
  const [evaluationToDelete, setEvaluationToDelete] = useState<Evaluation | null>(null);

  const fetchPatientWithHistory = useCallback(async (id: number) => {
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
  }, [fetchWithAuth]);

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
        refreshPatients(searchTerm);
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
        refreshPatients(searchTerm);
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
        refreshPatients(searchTerm);
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
        refreshPatients(searchTerm);
      }
    } catch (err) {
      alert('Erro ao excluir entrada');
    }
  };

  return {
    modals: {
      isDeleteModalOpen, setIsDeleteModalOpen,
      isDetailModalOpen, setIsDetailModalOpen,
      isFormModalOpen, setIsFormModalOpen,
      isEvalModalOpen, setIsEvalModalOpen,
      isDeleteEvalModalOpen, setIsDeleteEvalModalOpen
    },
    data: {
      selectedPatient, setSelectedPatient,
      patientToEdit, setPatientToEdit,
      evaluationToEdit, setEvaluationToEdit,
      evaluationToDelete, setEvaluationToDelete
    },
    actions: {
      fetchPatientWithHistory,
      savePatient,
      saveEvaluation,
      confirmDelete,
      confirmDeleteEvaluation
    }
  };
}
