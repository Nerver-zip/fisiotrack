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

  test('deve paginar corretamente exibindo 10 pacientes por vez', async () => {
    mockStatusCall(true);

    // Gera 15 pacientes mockados
    const manyPatients = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `Paciente ${String(i + 1).padStart(2, '0')}`,
      evaluations: []
    }));

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: 'tk' }),
    });

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => manyPatients,
    });

    render(<App />);
    
    // Login
    const passwordInput = await screen.findByLabelText(/Senha de Acesso/i);
    fireEvent.change(passwordInput, { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    // Verifica se os primeiros 10 estão na tela
    await waitFor(() => {
      expect(screen.getByText(/Paciente 01/i)).toBeInTheDocument();
      expect(screen.getByText(/Paciente 10/i)).toBeInTheDocument();
    });
    
    // Verifica se o 11 NÃO está na tela (primeira página)
    expect(screen.queryByText(/Paciente 11/i)).not.toBeInTheDocument();

    // Clica em "Próxima"
    const nextButton = screen.getByText(/Próxima/i);
    fireEvent.click(nextButton);

    // Agora o 11 deve aparecer e o 01 sumir
    await waitFor(() => {
      expect(screen.getByText(/Paciente 11/i)).toBeInTheDocument();
      expect(screen.getByText(/Paciente 15/i)).toBeInTheDocument();
      expect(screen.queryByText(/Paciente 01/i)).not.toBeInTheDocument();
    });

    // Verifica se o botão "Próxima" está desabilitado na última página
    expect(nextButton).toBeDisabled();

    // Volta para a primeira página
    const prevButton = screen.getByText(/Anterior/i);
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(screen.getByText(/Paciente 01/i)).toBeInTheDocument();
      expect(prevButton).toBeDisabled();
    });
  });

  test('deve truncar diagnóstico médico em 30 caracteres na tabela', async () => {
    mockStatusCall(true);

    const longDiagnosis = "Este é um diagnóstico médico extremamente longo para testar o truncamento da interface.";
    const patientWithLongDiag = [{
      id: 1,
      name: "Paciente Teste",
      evaluations: [{
        evaluation_date: "2024-03-18",
        medical_diagnosis: longDiagnosis
      }]
    }];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: 'tk' }),
    });

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => patientWithLongDiag,
    });

    render(<App />);
    
    // Login
    const passwordInput = await screen.findByLabelText(/Senha de Acesso/i);
    fireEvent.change(passwordInput, { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    // Verifica o texto truncado (30 chars + ...)
    const expectedTruncated = longDiagnosis.substring(0, 30) + '...';
    await waitFor(() => {
      expect(screen.getByText(expectedTruncated)).toBeInTheDocument();
    });
  });
});
