import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AgendaView from './AgendaView';
import { Appointment } from '../../types';

const mockAppointments: Appointment[] = [
  {
    id: 1,
    patient_name: 'João Silva',
    patient_id: 10,
    appointment_date: '2026-03-26',
    appointment_time: '09:00',
    duration_minutes: 30,
    notes: 'Avaliação inicial',
    status: 'scheduled'
  },
  {
    id: 2,
    patient_name: 'Maria Oliveira',
    appointment_date: '2026-03-26',
    appointment_time: '09:15',
    duration_minutes: 30,
    notes: 'Retorno',
    status: 'scheduled'
  }
];

describe('AgendaView', () => {
  const createDefaultProps = () => ({
    currentDate: '2026-03-26',
    setCurrentDate: jest.fn(),
    appointments: mockAppointments,
    loading: false,
    error: null as string | null,
    onNewAppointment: jest.fn(),
    onEditAppointment: jest.fn(),
    onDeleteAppointment: jest.fn(),
    checkConflicts: jest.fn((_appt: any): Appointment[] => [])
  });

  test('deve renderizar o título e controles da agenda', () => {
    render(<AgendaView {...createDefaultProps()} />);
    // O título agora é apenas "Agenda" (dentro do h1)
    expect(screen.getByRole('heading', { name: /^Agenda$/i })).toBeInTheDocument();
    expect(screen.getByText(/Novo Agendamento/i)).toBeInTheDocument();
  });

  test('deve exibir a lista de agendamentos', () => {
    render(<AgendaView {...createDefaultProps()} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument();
    expect(screen.getByText('09:15')).toBeInTheDocument();
  });

  test('deve mostrar alerta de conflito quando houver sobreposição', () => {
    const props = createDefaultProps();
    props.checkConflicts = jest.fn((appt) => {
        if (appt.id === 1 || appt.id === 2) return [mockAppointments[0]];
        return [];
    });
    render(<AgendaView {...props} />);
    // O texto agora é simplificado para "Conflito"
    const conflictAlerts = screen.getAllByText(/Conflito/i);
    expect(conflictAlerts.length).toBe(2);
  });

  test('deve chamar onNewAppointment ao clicar no botão de novo agendamento', () => {
    const props = createDefaultProps();
    render(<AgendaView {...props} />);
    fireEvent.click(screen.getByText(/Novo Agendamento/i));
    expect(props.onNewAppointment).toHaveBeenCalled();
  });

  test('deve navegar para o próximo dia', () => {
    const props = createDefaultProps();
    render(<AgendaView {...props} />);
    fireEvent.click(screen.getByTitle(/Próximo dia/i));
    expect(props.setCurrentDate).toHaveBeenCalledWith('2026-03-27');
  });

  test('deve exibir estado vazio quando não houver agendamentos', () => {
    const props = createDefaultProps();
    props.appointments = [];
    render(<AgendaView {...props} />);
    expect(screen.getByText(/Nenhum agendamento encontrado/i)).toBeInTheDocument();
  });

  test('deve exibir mensagem de erro quando houver erro', () => {
    const props = createDefaultProps();
    props.error = "Erro de conexão";
    render(<AgendaView {...props} />);
    expect(screen.getByText(/Erro de conexão/i)).toBeInTheDocument();
  });

  test('deve chamar onEditAppointment ao clicar no botão editar', () => {
    const props = createDefaultProps();
    render(<AgendaView {...props} />);
    // Usamos getAllByTitle pois agora os botões têm títulos mais descritivos
    const editButtons = screen.getAllByTitle(/Editar Agendamento/i);
    fireEvent.click(editButtons[0]);
    expect(props.onEditAppointment).toHaveBeenCalledWith(mockAppointments[0]);
  });
});
