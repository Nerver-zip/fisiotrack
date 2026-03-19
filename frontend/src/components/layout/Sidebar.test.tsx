import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';

describe('Sidebar Component', () => {
  const mockOnClose = jest.fn();
  const mockOnAuditClick = jest.fn();
  const mockOnLogoutClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve renderizar informações do usuário', () => {
    render(
      <Sidebar 
        isOpen={true}
        onClose={mockOnClose}
        userName="João Silva"
        onAuditClick={mockOnAuditClick}
        onLogoutClick={mockOnLogoutClick}
      />
    );

    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Fisioterapeuta')).toBeInTheDocument();
  });

  test('deve renderizar itens do menu', () => {
    render(
      <Sidebar 
        isOpen={true}
        onClose={mockOnClose}
        userName="João Silva"
        onAuditClick={mockOnAuditClick}
        onLogoutClick={mockOnLogoutClick}
      />
    );

    expect(screen.getByText('Auditoria')).toBeInTheDocument();
    expect(screen.getByText('Sair')).toBeInTheDocument();
    expect(screen.getByText('FisioTrack v2.0')).toBeInTheDocument();
  });

  test('deve chamar onAuditClick ao clicar em Auditoria e fechar o sidebar', () => {
    render(
      <Sidebar 
        isOpen={true}
        onClose={mockOnClose}
        userName="João Silva"
        onAuditClick={mockOnAuditClick}
        onLogoutClick={mockOnLogoutClick}
      />
    );

    fireEvent.click(screen.getByText('Auditoria'));
    expect(mockOnAuditClick).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('deve chamar onLogoutClick ao clicar em Sair e fechar o sidebar', () => {
    render(
      <Sidebar 
        isOpen={true}
        onClose={mockOnClose}
        userName="João Silva"
        onAuditClick={mockOnAuditClick}
        onLogoutClick={mockOnLogoutClick}
      />
    );

    fireEvent.click(screen.getByText('Sair'));
    expect(mockOnLogoutClick).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('deve chamar onClose ao clicar no botão fechar ou no backdrop', () => {
    const { container } = render(
      <Sidebar 
        isOpen={true}
        onClose={mockOnClose}
        userName="João Silva"
        onAuditClick={mockOnAuditClick}
        onLogoutClick={mockOnLogoutClick}
      />
    );

    // Botão fechar (X)
    // Sidebar uses Lucide X icon inside a button with class sidebar-close
    const closeButton = container.querySelector('.sidebar-close');
    if (closeButton) fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Backdrop
    const backdrop = container.querySelector('.sidebar-backdrop');
    if (backdrop) fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });
});
