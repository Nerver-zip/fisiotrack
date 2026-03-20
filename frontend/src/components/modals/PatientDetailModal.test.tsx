import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PatientDetailModal from './PatientDetailModal';
import { Patient } from '../../types';

const mockPatient: Patient = {
  id: 1,
  name: 'Paciente Teste',
  cpf: '123.456.789-00',
  birth_date: '1990-01-01',
  healthcare_id: 'CONV-123',
  gender: 'Masculino',
  profession: 'Engenheiro',
  phone: ['(11) 99999-9999'],
  address: 'Rua Teste, 123',
  mom_name: 'Mãe Teste',
  evaluations: [
    {
      id: 10,
      patient_id: 1,
      evaluation_date: '2024-03-19',
      doctor: 'Dr. Silva',
      medical_diagnosis: 'Diagnóstico 1',
      chief_complaint: 'Dor',
      history_present_illness: 'HDA',
      past_medical_history: 'HPP',
      medications: 'Meds',
      habits_activities: 'Habits',
      physical_exam: 'Exam',
      treatment_plan: 'Plan'
    }
  ]
};

describe('PatientDetailModal', () => {
  const mockOnClose = jest.fn();
  const mockOnAddEvaluation = jest.fn();
  const mockOnEditPatient = jest.fn();
  const mockOnEditEvaluation = jest.fn();
  const mockOnDeleteEvaluation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve renderizar dados do paciente e ícones de ação corretamente', () => {
    render(
      <PatientDetailModal 
        isOpen={true}
        patient={mockPatient}
        onClose={mockOnClose}
        onAddEvaluation={mockOnAddEvaluation}
        onEditPatient={mockOnEditPatient}
        onEditEvaluation={mockOnEditEvaluation}
        onDeleteEvaluation={mockOnDeleteEvaluation}
      />
    );

    expect(screen.getByText('Paciente Teste')).toBeInTheDocument();
    expect(screen.getByText('123.456.789-00')).toBeInTheDocument();

    // Verifica ícones/botões de ação por title
    expect(screen.getByTitle(/Editar Dados Cadastrais/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Nova Entrada Clínica/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Editar Entrada/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Excluir Entrada/i)).toBeInTheDocument();
  });

  test('deve chamar onEditPatient ao clicar no ícone de editar dados', () => {
    render(
      <PatientDetailModal 
        isOpen={true}
        patient={mockPatient}
        onClose={mockOnClose}
        onAddEvaluation={mockOnAddEvaluation}
        onEditPatient={mockOnEditPatient}
        onEditEvaluation={mockOnEditEvaluation}
        onDeleteEvaluation={mockOnDeleteEvaluation}
      />
    );

    fireEvent.click(screen.getByTitle(/Editar Dados Cadastrais/i));
    expect(mockOnEditPatient).toHaveBeenCalledWith(mockPatient);
  });

  test('deve chamar onAddEvaluation ao clicar no ícone de nova entrada', () => {
    render(
      <PatientDetailModal 
        isOpen={true}
        patient={mockPatient}
        onClose={mockOnClose}
        onAddEvaluation={mockOnAddEvaluation}
        onEditPatient={mockOnEditPatient}
        onEditEvaluation={mockOnEditEvaluation}
        onDeleteEvaluation={mockOnDeleteEvaluation}
      />
    );

    fireEvent.click(screen.getByTitle(/Nova Entrada Clínica/i));
    expect(mockOnAddEvaluation).toHaveBeenCalledWith(1);
  });

  test('deve chamar onEditEvaluation ao clicar no ícone de editar avaliação', () => {
    render(
      <PatientDetailModal 
        isOpen={true}
        patient={mockPatient}
        onClose={mockOnClose}
        onAddEvaluation={mockOnAddEvaluation}
        onEditPatient={mockOnEditPatient}
        onEditEvaluation={mockOnEditEvaluation}
        onDeleteEvaluation={mockOnDeleteEvaluation}
      />
    );

    fireEvent.click(screen.getByTitle(/Editar Entrada/i));
    expect(mockOnEditEvaluation).toHaveBeenCalledWith(mockPatient.evaluations![0]);
  });

  test('deve chamar onDeleteEvaluation ao clicar no ícone de excluir entrada', () => {
    render(
      <PatientDetailModal 
        isOpen={true}
        patient={mockPatient}
        onClose={mockOnClose}
        onAddEvaluation={mockOnAddEvaluation}
        onEditPatient={mockOnEditPatient}
        onEditEvaluation={mockOnEditEvaluation}
        onDeleteEvaluation={mockOnDeleteEvaluation}
      />
    );

    fireEvent.click(screen.getByTitle(/Excluir Entrada/i));
    expect(mockOnDeleteEvaluation).toHaveBeenCalledWith(mockPatient.evaluations![0]);
  });
});
