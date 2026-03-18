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

  test('deve renderizar a tela de login inicialmente se não houver token', () => {
    render(<App />);
    expect(screen.getByText(/Senha de Acesso/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Digite sua senha master/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
  });

  test('deve exibir erro ao tentar login com senha incorreta', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Senha incorreta' }),
    });

    render(<App />);
    
    const passwordInput = screen.getByPlaceholderText(/Digite sua senha master/i);
    const loginButton = screen.getByRole('button', { name: /Entrar/i });

    fireEvent.change(passwordInput, { target: { value: 'wrong_password' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/Senha incorreta/i)).toBeInTheDocument();
    });
  });

  test('deve realizar login com sucesso e salvar o token', async () => {
    const mockToken = 'mock_auth_token_123';
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: mockToken }),
    });
    
    // Mock subsequente para o fetchPatients que ocorre após o login
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ([]),
    });

    render(<App />);
    
    const passwordInput = screen.getByPlaceholderText(/Digite sua senha master/i);
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
    
    // Mock para fetchPatients ao carregar com token
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
    
    await waitFor(() => {
      expect(screen.getByText(/Sair/i)).toBeInTheDocument();
    });

    const logoutButton = screen.getByText(/Sair/i);
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(localStorage.getItem('fisio_token')).toBeNull();
      expect(screen.getByText(/Senha de Acesso/i)).toBeInTheDocument();
    });
  });
});
