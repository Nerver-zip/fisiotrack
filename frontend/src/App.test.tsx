import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

// Mock do fetch global
global.fetch = jest.fn() as jest.Mock;

// Mock do componente SyncIcon para testar o estado no App
jest.mock('./components/common/SyncIcon', () => {
  return function DummySyncIcon({ state }: { state: string }) {
    return <div data-testid="sync-status">{state}</div>;
  };
});

describe('App - Fluxo de autenticação da clínica', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    // Mock padrão para config de nuvem e status (chamados pelo useAuth e effects)
    (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/backup/config')) {
            return Promise.resolve({
                ok: true,
                json: async () => ({ is_enabled: true, has_token: true })
            });
        }
        if (url.includes('/api/auth/status')) {
            return Promise.resolve({
                ok: true,
                json: async () => ({ initialized: true })
            });
        }
        if (url.includes('/api/patients') || url.includes('/api/audit')) {
            return Promise.resolve({ ok: true, status: 200, json: async () => ([]) });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  test('deve renderizar a tela de login inicialmente', async () => {
    render(<App />);
    expect(screen.getByText(/Acesso à Clínica/i)).toBeInTheDocument();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  test('deve mostrar a configuração inicial quando o banco ainda não existe', async () => {
    (fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: async () => ({ initialized: false })
    }));
    render(<App />);
    expect(await screen.findByText(/Configuração Inicial/i)).toBeInTheDocument();
  });

  test('deve realizar a configuração inicial com sucesso', async () => {
    (fetch as jest.Mock).mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: async () => ({ initialized: false })
    }));
    render(<App />);
    await screen.findByText(/Configuração Inicial/i);

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ token: 'new_token' }),
    });

    fireEvent.change(screen.getByLabelText(/Definir Senha Mestre/i), { target: { value: 'SecurePass123' } });
    fireEvent.change(screen.getByLabelText(/Confirmar Senha/i), { target: { value: 'SecurePass123' } });

    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Concluir Configuração/i }));
    });

    await waitFor(() => {
      expect(localStorage.getItem('fisio_token')).toBe('new_token');
      expect(screen.getByText(/Equipe da Clínica/i)).toBeInTheDocument();
    });
  });

  test('deve realizar login com sucesso e salvar o token', async () => {
    const mockToken = 'mock_auth_token_123';
    render(<App />);
    await screen.findByText(/Acesso à Clínica/i);

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: mockToken }),
    });

    fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), { target: { value: 'pass123' } });

    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));
    });

    await waitFor(() => {
      expect(localStorage.getItem('fisio_token')).toBe(mockToken);
      expect(screen.getByText(/Equipe da Clínica/i)).toBeInTheDocument();
    });
  });

  test('deve realizar logout corretamente e limpar o localStorage', async () => {
    localStorage.setItem('fisio_token', 'active_token');

    const { container } = render(<App />);

    await waitFor(() => {
        expect(screen.getByText(/Equipe da Clínica/i)).toBeInTheDocument();
    });

    const menuTrigger = container.querySelector('.navbar-menu-trigger');
    if (menuTrigger) fireEvent.click(menuTrigger);

    const logoutButton = await screen.findByText(/Sair/i);
    await act(async () => {
        fireEvent.click(logoutButton);
    });

    await waitFor(() => {
      expect(localStorage.getItem('fisio_token')).toBeNull();
      expect(screen.getByText(/Acesso à Clínica/i)).toBeInTheDocument();
    });
  });

  test('deve navegar entre as abas corretamente', async () => {
    render(<App />);
    await screen.findByText(/Acesso à Clínica/i);

    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ token: 'tk' }) });

    fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), { target: { value: 'pass' } });
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar paciente por nome/i)).toBeInTheDocument();
    });

    const menuTrigger = document.querySelector('.navbar-menu-trigger');
    if (menuTrigger) fireEvent.click(menuTrigger);

    await act(async () => {
        fireEvent.click(await screen.findByText(/Auditoria/i));
    });

    await waitFor(() => {
      expect(screen.getByText(/Registro de Auditoria/i)).toBeInTheDocument();
    });
  });

  test('deve paginar corretamente exibindo 10 pacientes por vez', async () => {
    const manyPatients = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `Paciente ${String(i + 1).padStart(2, '0')}`,
      evaluations: []
    }));

    (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/patients')) {
            return Promise.resolve({ ok: true, status: 200, json: async () => manyPatients });
        }
        if (url.includes('/api/auth/status')) {
            return Promise.resolve({ ok: true, json: async () => ({ initialized: true }) });
        }
        if (url.includes('/api/backup/config')) {
            return Promise.resolve({ ok: true, json: async () => ({ is_enabled: true, has_token: true }) });
        }
        return Promise.resolve({ ok: true, json: async () => ([]) });
    });

    render(<App />);
    await screen.findByText(/Acesso à Clínica/i);

    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ token: 'tk' }) });

    fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), { target: { value: 'pass' } });
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Paciente 01/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Próxima/i));

    await waitFor(() => {
      expect(screen.getByText(/Paciente 11/i)).toBeInTheDocument();
    });
  });

  test('deve mudar status de sincronização para pendente após uma mutação (POST)', async () => {
    render(<App />);
    await screen.findByText(/Acesso à Clínica/i);

    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ token: 'tk' }) });

    fireEvent.change(screen.getByLabelText(/Senha de Acesso/i), { target: { value: 'pass' } });
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('sync-status')).toHaveTextContent('pendente');
    });

    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ status: 'ok' }) });

    fireEvent.click(screen.getByText(/Novo Paciente/i));
    fireEvent.change(screen.getByLabelText(/Nome Completo/i), { target: { value: 'Sync Test' } });

    await act(async () => {
        fireEvent.click(screen.getByText(/Salvar Ficha/i));
    });

    await waitFor(() => {
      expect(screen.getByTestId('sync-status')).toHaveTextContent('pendente');
    });
  });
});
