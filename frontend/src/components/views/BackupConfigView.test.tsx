import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BackupConfigView from './BackupConfigView';
import { API_BASE_URL } from '../../config';

describe('BackupConfigView Component', () => {
  const mockFetchWithAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve carregar e exibir configurações iniciais', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ provider: 'google_drive', folder_id: '123', is_enabled: true, has_token: true }),
    });

    await act(async () => {
      render(<BackupConfigView fetchWithAuth={mockFetchWithAuth} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Conectado/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('123')).toBeInTheDocument();
      expect(screen.getByText(/Desativar Backup/i)).toBeInTheDocument();
    });
  });

  test('deve exibir estado desconectado quando não há token', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ provider: 'google_drive', folder_id: '', is_enabled: false, has_token: false }),
    });

    await act(async () => {
      render(<BackupConfigView fetchWithAuth={mockFetchWithAuth} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Desconectado/i)).toBeInTheDocument();
      expect(screen.getByText(/Conectar Conta do Google/i)).toBeInTheDocument();
    });
  });

  test('deve salvar alterações no folder_id', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ provider: 'google_drive', folder_id: 'old', is_enabled: true, has_token: true }),
      })
      .mockResolvedValueOnce({ ok: true }); // Mock do POST save

    await act(async () => {
      render(<BackupConfigView fetchWithAuth={mockFetchWithAuth} />);
    });

    const input = await screen.findByLabelText(/ID da Pasta/i);
    fireEvent.change(input, { target: { value: 'new_folder_id' } });

    fireEvent.click(screen.getByText(/Salvar Alterações/i));

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/backup/config`,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('new_folder_id')
        })
      );
      expect(screen.getByText(/Configuração salva com sucesso/i)).toBeInTheDocument();
    });
  });
});
