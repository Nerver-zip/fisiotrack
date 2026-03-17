import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PatientFormModal from './PatientFormModal';
import { Patient } from '../../types';

describe('PatientFormModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  const samplePatient: Patient = {
    id: 1,
    healthcare_id: 'SUS-123',
    name: 'Maria Souza',
    mom_name: 'Ana Souza',
    birth_date: '1985-05-20',
    cpf: '123.456.789-00',
    gender: 'Feminino',
    address: 'Rua das Palmeiras, 45',
    profession: 'Arquiteta',
    phone: ['11988887777']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. deve renderizar todos os campos obrigatorios da ficha de avaliacao (Novo Paciente)', () => {
    render(
      <PatientFormModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
      />
    );

    expect(screen.getByLabelText(/^Nome Completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Médico Solicitante/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Plano de Tratamento/i)).toBeInTheDocument();
  });

  test('2. deve processar múltiplos telefones e avaliacao inicial no submit', () => {
    render(
      <PatientFormModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
      />
    );

    fireEvent.change(screen.getByLabelText(/^Nome Completo/i), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByLabelText(/^Telefone/i), { target: { value: '11999998888, 11777776666' } });
    fireEvent.change(screen.getByLabelText(/^Nascimento/i), { target: { value: '1990-01-01' } });

    fireEvent.submit(screen.getByRole('button', { name: /Salvar Ficha/i }));

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    const savedPatient = mockOnSave.mock.calls[0][0];
    expect(savedPatient.name).toBe('João Silva');
    expect(savedPatient.phone).toEqual(['11999998888', '11777776666']);
    expect(savedPatient.evaluations).toHaveLength(1);
  });

  test('3. deve ocultar campos de avaliação inicial ao editar um paciente', () => {
    render(
      <PatientFormModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
        patientToEdit={samplePatient}
      />
    );

    // Campos de identificação devem estar lá
    expect(screen.getByLabelText(/^Nome Completo/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Arquiteta')).toBeInTheDocument();

    // Campos de avaliação NÃO devem estar lá
    expect(screen.queryByLabelText(/^Médico Solicitante/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Queixa Principal/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Plano de Tratamento/i)).not.toBeInTheDocument();
  });

  test('4. deve preencher o formulário com os dados do paciente para edição', () => {
    render(
      <PatientFormModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
        patientToEdit={samplePatient}
      />
    );

    expect(screen.getByLabelText(/^Nome Completo/i)).toHaveValue('Maria Souza');
    expect(screen.getByLabelText(/^Nome da Mãe/i)).toHaveValue('Ana Souza');
    expect(screen.getByLabelText(/^Telefone/i)).toHaveValue('11988887777');
  });

  test('5. deve abrir modal de confirmação ao tentar salvar alterações em um paciente', () => {
    render(
      <PatientFormModal 
        isOpen={true} 
        onClose={mockOnClose} 
        onSave={mockOnSave} 
        patientToEdit={samplePatient}
      />
    );

    // Altera um campo
    fireEvent.change(screen.getByLabelText(/^Nome Completo/i), { target: { value: 'Maria Souza Alterada' } });
    
    // Tenta salvar
    fireEvent.submit(screen.getByRole('button', { name: /Atualizar Dados/i }));

    // O mockOnSave NÃO deve ter sido chamado ainda, pois deve abrir o modal de confirmação
    expect(mockOnSave).not.toHaveBeenCalled();

    // Verifica se o texto do modal de confirmação apareceu
    expect(screen.getByText(/Confirmar Alterações/i)).toBeInTheDocument();
    expect(screen.getByText(/Esta ação não pode ser desfeita/i)).toBeInTheDocument();
    
    // Agora existem dois "Nome Completo" (o label e a lista de mudanças)
    const nameFields = screen.getAllByText(/Nome Completo/i);
    expect(nameFields.length).toBeGreaterThanOrEqual(2);

    // Agora confirma no modal secundário
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Edição/i }));

    // Agora sim deve ter chamado o onSave
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave.mock.calls[0][0].name).toBe('Maria Souza Alterada');
  });
});
