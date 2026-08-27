import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AppointmentFormModal from './AppointmentFormModal';
import { Appointment } from '../../types';

describe('AppointmentFormModal', () => {
  const createDefaultProps = () => ({
    isOpen: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
    apptToEdit: null as Appointment | null | undefined,
    currentDate: '2026-03-26',
    fetchWithAuth: jest.fn().mockResolvedValue({
      ok: true,
      json: async () => []
    }) as jest.Mock<Promise<Response>>,
    checkConflicts: jest.fn((_appt: any): Appointment[] => [])
  });


  test('deve renderizar o formulário de novo agendamento', async () => {
    await act(async () => {
      render(<AppointmentFormModal {...createDefaultProps()} />);
    });
    expect(screen.getByText(/Novo Agendamento/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Buscar paciente ou digitar nome.../i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Horário/i)).toBeInTheDocument();
  });

  test('deve exibir dados do agendamento ao editar', async () => {
    const apptToEdit: Appointment = {
      id: 1,
      patient_name: 'João Silva',
      appointment_date: '2026-03-26',
      appointment_time: '14:00',
      duration_minutes: 45,
      notes: 'Notas de teste',
      status: 'scheduled'
    };
    await act(async () => {
      render(<AppointmentFormModal {...createDefaultProps()} apptToEdit={apptToEdit} />);
    });
    expect(screen.getByText(/Editar Agendamento/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('João Silva')).toBeInTheDocument();
    expect(screen.getByDisplayValue('14:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('45')).toBeInTheDocument();
  });

  test('deve chamar onSave com os dados do formulário', async () => {
    const props = createDefaultProps();
    await act(async () => {
      render(<AppointmentFormModal {...props} />);
    });

    fireEvent.change(screen.getByPlaceholderText(/Buscar paciente ou digitar nome.../i), { target: { value: 'Paciente Teste' } });
    fireEvent.change(screen.getByLabelText(/Horário/i), { target: { value: '16:00' } });

    await act(async () => {
      fireEvent.click(screen.getByText(/Confirmar Agendamento/i));
    });

    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({
      patient_name: 'Paciente Teste',
      appointment_time: '16:00'
    }));
  });

  test('deve exibir banner de conflito quando checkConflicts retornar algo', async () => {
    const conflictingAppt: Appointment = {
      id: 99,
      patient_name: 'Conflitante',
      appointment_date: '2026-03-26',
      appointment_time: '09:00',
      duration_minutes: 30,
      notes: '',
      status: 'scheduled'
    };
    const props = createDefaultProps();
    props.checkConflicts = jest.fn((_appt: any) => [conflictingAppt]);
    await act(async () => {
      render(<AppointmentFormModal {...props} />);
    });
    expect(screen.getByText(/Aviso de Conflito/i)).toBeInTheDocument();
    expect(screen.getByText(/Este horário sobrepõe o agendamento de:/i)).toBeInTheDocument();
    expect(screen.getByText('Conflitante')).toBeInTheDocument();
  });

  test('deve realizar busca de pacientes ao digitar', async () => {
    const mockPatients = [{ id: 1, name: 'João Silva', cpf: '123' }];
    let resolveFetch: ((value: Response) => void) | null = null;
    const fetchMock = jest.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const props = createDefaultProps();
    props.fetchWithAuth = fetchMock;
    await act(async () => {
      render(<AppointmentFormModal {...props} />);
    });

    const input = screen.getByPlaceholderText(/Buscar paciente ou digitar nome.../i);
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Joã' } });
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      resolveFetch?.({
        ok: true,
        json: async () => mockPatients
      } as any);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('João Silva')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('João Silva'));
    });
    expect(screen.getByDisplayValue('João Silva')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('deve tornar o campo de nome do paciente readOnly na edição de agendamento vinculado', async () => {
    const apptWithPatient: Appointment = {
      id: 1,
      patient_id: 123,
      patient_name: 'Paciente Cadastrado',
      appointment_date: '2026-03-26',
      appointment_time: '10:00',
      duration_minutes: 30,
      notes: '',
      status: 'scheduled'
    };

    const props = createDefaultProps();
    props.apptToEdit = apptWithPatient;

    await act(async () => {
      render(<AppointmentFormModal {...props} />);
    });

    const nameInput = screen.getByLabelText(/Paciente/i);
    expect(nameInput).toHaveAttribute('readOnly');
    expect(nameInput).toHaveStyle('background-color: rgb(245, 245, 245)');
  });
});
