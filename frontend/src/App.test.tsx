import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock do fetch global
global.fetch = jest.fn() as jest.Mock;

describe('App - Fluxo de Autenticação (Zero-Knowledge)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  const mockStatusCall = (initialized: boolean) => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ initialized }),
    });
  };

  test('deve renderizar a tela de setup se o banco não estiver inicializado', async () => {
    mockStatusCall(false);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Configuração Inicial/i)).toBeInTheDocument();
    });
  });

  test('deve exibir erro se as senhas não coincidirem no setup', async () => {
    mockStatusCall(false);

    render(<App />);
    
    const passInput = await screen.findByLabelText(/Definir Senha Mestre/i);
    const confirmInput = screen.getByLabelText(/Confirmar Senha/i);
    const setupButton = screen.getByRole('button', { name: /Criar Banco Criptografado/i });

    fireEvent.change(passInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'different' } });
    fireEvent.click(setupButton);

    expect(screen.getByText(/As senhas não coincidem/i)).toBeInTheDocument();
  });

  test('deve realizar setup com sucesso', async () => {
    mockStatusCall(false);
    
    // Mock do POST setup
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ token: 'new_token' }),
    });

    // Mock do fetchPatients inicial
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ([]),
    });

    render(<App />);
    
    const passInput = await screen.findByLabelText(/Definir Senha Mestre/i);
    const confirmInput = screen.getByLabelText(/Confirmar Senha/i);
    const setupButton = screen.getByRole('button', { name: /Criar Banco Criptografado/i });

    fireEvent.change(passInput, { target: { value: 'securepassword' } });
    fireEvent.change(confirmInput, { target: { value: 'securepassword' } });
    fireEvent.click(setupButton);

    await waitFor(() => {
      expect(localStorage.getItem('fisio_token')).toBe('new_token');
      expect(screen.getByText(/Dr. Fisioterapeuta/i)).toBeInTheDocument();
    });
  });

  test('deve renderizar a tela de login inicialmente se o banco já estiver inicializado', async () => {
    mockStatusCall(true);

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Senha de Acesso/i)).toBeInTheDocument();
    });
  });

  test('deve exibir erro ao tentar login com senha incorreta', async () => {
    mockStatusCall(true);

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Senha incorreta' }),
    });

    render(<App />);
    
    const passwordInput = await screen.findByLabelText(/Senha de Acesso/i);
    const loginButton = screen.getByRole('button', { name: /Entrar/i });

    fireEvent.change(passwordInput, { target: { value: 'wrong_password' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/Senha incorreta/i)).toBeInTheDocument();
    });
  });

  test('deve realizar login com sucesso e salvar o token', async () => {
    mockStatusCall(true);

    const mockToken = 'mock_auth_token_123';
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: mockToken }),
    });
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ([]),
    });

    render(<App />);
    
    const passwordInput = await screen.findByLabelText(/Senha de Acesso/i);
    const loginButton = screen.getByRole('button', { name: /Entrar/i });

    fireEvent.change(passwordInput, { target: { value: 'correct_password' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(localStorage.getItem('fisio_token')).toBe(mockToken);
      expect(screen.getByText(/Dr. Fisioterapeuta/i)).toBeInTheDocument();
    });
  });

  test('deve realizar logout corretamente e limpar o localStorage', async () => {
    localStorage.setItem('fisio_token', 'active_token');
    
    // Em modo autenticado (token no localStorage), App chama status e fetchPatients
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ initialized: true }),
    });

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ([]),
    });

    // Mock para o endpoint de logout
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'logged out' }),
    });

    render(<App />);
    
    const logoutButton = await screen.findByText(/Sair/i);
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(localStorage.getItem('fisio_token')).toBeNull();
      expect(screen.getByText(/Senha de Acesso/i)).toBeInTheDocument();
    });
  });
});
