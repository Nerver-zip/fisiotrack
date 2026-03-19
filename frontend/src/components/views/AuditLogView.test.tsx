import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuditLogView from './AuditLogView';

describe('AuditLogView Component', () => {
  const mockFetchWithAuth = jest.fn();

  const sampleLogs = [
    {
      id: 1,
      timestamp: '2024-03-18T10:00:00',
      action: 'PATIENT_CREATE',
      entity_id: 101,
      details: 'Criou paciente Teste',
      user_info: 'session_abc'
    },
    {
      id: 2,
      timestamp: '2024-03-18T10:05:00',
      action: 'PATIENT_DELETE',
      entity_id: 102,
      details: 'Excluiu paciente Antigo',
      user_info: 'session_abc'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve carregar e exibir logs ao montar o componente', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => sampleLogs,
    });

    render(<AuditLogView fetchWithAuth={mockFetchWithAuth} />);

    expect(screen.getByText(/Carregando registros/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('PATIENT_CREATE')).toBeInTheDocument();
      expect(screen.getByText('PATIENT_DELETE')).toBeInTheDocument();
      expect(screen.getByText('Criou paciente Teste')).toBeInTheDocument();
      expect(screen.getByText('101')).toBeInTheDocument();
    });

    expect(mockFetchWithAuth).toHaveBeenCalledWith('http://localhost:8080/api/audit');
  });

  test('deve exibir mensagem quando não houver logs', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<AuditLogView fetchWithAuth={mockFetchWithAuth} />);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum registro encontrado/i)).toBeInTheDocument();
    });
  });

  test('deve recarregar logs ao clicar no botão Atualizar', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<AuditLogView fetchWithAuth={mockFetchWithAuth} />);

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledTimes(1);
    });

    const updateButton = screen.getByRole('button', { name: /Atualizar/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledTimes(2);
    });
  });

  test('deve aplicar cores diferentes para ações de exclusão', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => sampleLogs,
    });

    render(<AuditLogView fetchWithAuth={mockFetchWithAuth} />);

    await waitFor(() => {
      const deleteBadge = screen.getByText('PATIENT_DELETE');
      // Verifica se o estilo de background de erro (vermelho claro) está aplicado
      expect(deleteBadge).toHaveStyle('background-color: #f2dede');
    });
  });
});
