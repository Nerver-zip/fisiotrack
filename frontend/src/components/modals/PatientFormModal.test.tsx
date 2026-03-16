import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PatientFormModal from './PatientFormModal';

describe('PatientFormModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve renderizar todos os campos obrigatorios da ficha de avaliacao', () => {
    render(
      <PatientFormModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
      />
    );

    // Verifica campos de Identificacao usando matchers mais especificos para evitar duplicidade de texto
    expect(screen.getByLabelText(/^ID Convênio \/ SUS/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nome Completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nome da Mãe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Idade$/i)).toBeInTheDocument(); // Match exato para "Idade"
    expect(screen.getByLabelText(/^CPF/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Sexo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nascimento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Profissão/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Telefone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Endereço/i)).toBeInTheDocument();

    // Verifica campos de Avaliacao
    expect(screen.getByLabelText(/^Médico Solicitante/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Diagnóstico Médico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Queixa Principal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^História da Doença Atual \(HDA\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^História Patológica Pregressa \(HPP\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Medicamentos em uso/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Atividades e Hábitos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Exame Físico \/ Complementares/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Plano de Tratamento/i)).toBeInTheDocument();
  });

  test('deve processar múltiplos telefones e avaliacao inicial no submit', () => {
    render(
      <PatientFormModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
      />
    );

    fireEvent.change(screen.getByLabelText(/^Nome Completo/i), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByLabelText(/^Telefone/i), { target: { value: '11999998888, 11777776666' } });
    fireEvent.change(screen.getByLabelText(/^Diagnóstico Médico/i), { target: { value: 'Artrite' } });
    
    fireEvent.submit(screen.getByRole('button', { name: /Salvar Ficha/i }));

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    const savedPatient = mockOnSave.mock.calls[0][0];

    expect(savedPatient.name).toBe('João Silva');
    expect(savedPatient.phone).toEqual(['11999998888', '11777776666']);
    expect(savedPatient.evaluations).toHaveLength(1);
    expect(savedPatient.evaluations[0].medical_diagnosis).toBe('Artrite');
  });
});
