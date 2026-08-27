import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SessionHistoryModal from './SessionHistoryModal';
import { Patient, Appointment } from '../../types';

const mockPatient: Patient = {
  id: 1,
  name: 'João Silva',
  healthcare_id: 'H1',
  mom_name: 'Mãe',
  birth_date: '1990-01-01',
  cpf: '123',
  gender: 'M',
  address: 'Rua 1',
  profession: 'Prof',
  phone: ['123'],
  session_count: 5
};

const mockAppointments: Appointment[] = [
  {
    id: 10,
    patient_id: 1,
    patient_name: 'João Silva',
    appointment_date: '2026-03-20',
    appointment_time: '10:00',
    duration_minutes: 30,
    notes: 'Sessão 1',
    status: 'completed'
  },
  {
    id: 11,
    patient_id: 1,
    patient_name: 'João Silva',
    appointment_date: '2026-03-25',
    appointment_time: '14:00',
    duration_minutes: 30,
    notes: 'Sessão 2',
    status: 'scheduled'
  }
];

describe('SessionHistoryModal', () => {
  const defaultProps = {
    isOpen: true,
    patient: mockPatient,
    onClose: jest.fn(),
    onEditSession: jest.fn(),
    onNewAppointment: jest.fn(),
    fetchWithAuth: jest.fn(),
    refreshPatientData: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (defaultProps.fetchWithAuth as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAppointments
    });
  });

  test('deve renderizar o título e a contagem de sessões', async () => {
    await act(async () => {
      render(<SessionHistoryModal {...defaultProps} />);
    });

    expect(screen.getByText(/Histórico de Sessões: João Silva/i)).toBeInTheDocument();
    expect(screen.getByText(/5 sessões concluídas/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Sessão 1')).toBeInTheDocument();
      expect(screen.getByText('Sessão 2')).toBeInTheDocument();
    });
  });

  test('deve chamar onNewAppointment ao clicar no botão correspondente', async () => {
    await act(async () => {
      render(<SessionHistoryModal {...defaultProps} />);
    });

    fireEvent.click(screen.getByText(/Novo Agendamento/i));
    expect(defaultProps.onNewAppointment).toHaveBeenCalledWith(mockPatient);
  });

  test('deve exibir modal de confirmação ao clicar em concluir', async () => {
    await act(async () => {
      render(<SessionHistoryModal {...defaultProps} />);
    });

    await waitFor(() => screen.getByText('Sessão 2'));

    // O botão de concluir (CheckCircle2) para a sessão agendada
    const completeButtons = screen.getAllByTitle(/Marcar como Concluído/i);
    fireEvent.click(completeButtons[0]);

    expect(screen.getByText(/Deseja marcar esta sessão como concluída/i)).toBeInTheDocument();

    // Confirmar a conclusão
    await act(async () => {
      fireEvent.click(screen.getByText('Confirmar'));
    });

    await waitFor(() => {
      expect(defaultProps.fetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('/api/appointments/11'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  test('deve chamar onEditSession ao clicar no botão editar', async () => {
    await act(async () => {
      render(<SessionHistoryModal {...defaultProps} />);
    });

    await waitFor(() => screen.getByText('Sessão 1'));

    const editButtons = screen.getAllByTitle(/Editar Sessão/i);
    fireEvent.click(editButtons[0]);

    expect(defaultProps.onEditSession).toHaveBeenCalledWith(mockAppointments[0]);
  });

  test('deve exibir modal de confirmação ao clicar em excluir', async () => {
    await act(async () => {
      render(<SessionHistoryModal {...defaultProps} />);
    });

    await waitFor(() => screen.getByText('Sessão 1'));

    const deleteButtons = screen.getAllByTitle(/Excluir Sessão/i);
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText(/Tem certeza que deseja excluir permanentemente/i)).toBeInTheDocument();

    // Confirmar a exclusão
    await act(async () => {
      fireEvent.click(screen.getByText('Excluir'));
    });

    await waitFor(() => {
      expect(defaultProps.fetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('/api/appointments/10'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
