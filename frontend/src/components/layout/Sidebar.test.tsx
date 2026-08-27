import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';

describe('Sidebar Component', () => {
  const mockOnClose = jest.fn();
  const mockOnTabChange = jest.fn();
  const mockOnAuditClick = jest.fn();
  const mockOnBackupConfigClick = jest.fn();
  const mockOnExportClick = jest.fn();
  const mockOnLogoutClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    userName: "João Silva",
    activeTab: "pacientes",
    onTabChange: mockOnTabChange,
    onAuditClick: mockOnAuditClick,
    onBackupConfigClick: mockOnBackupConfigClick,
    onExportClick: mockOnExportClick,
    onLogoutClick: mockOnLogoutClick,
  };

  test('deve renderizar informações do usuário', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  test('deve renderizar itens do menu', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByText('Pacientes')).toBeInTheDocument();
    expect(screen.getByText('Agenda')).toBeInTheDocument();
    expect(screen.getByText('Estatísticas')).toBeInTheDocument();
    expect(screen.getByText('Auditoria')).toBeInTheDocument();
    expect(screen.getByText('Backup Cloud')).toBeInTheDocument();
    expect(screen.getByText('Exportar JSON')).toBeInTheDocument();
    expect(screen.getByText('Sair')).toBeInTheDocument();
    expect(screen.getByText('FisioTrack v2.0')).toBeInTheDocument();
  });

  test('deve chamar onExportClick ao clicar em Exportar JSON e fechar o sidebar', () => {
    render(<Sidebar {...defaultProps} />);

    fireEvent.click(screen.getByText('Exportar JSON'));
    expect(mockOnExportClick).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('deve chamar onTabChange ao clicar em Pacientes e fechar o sidebar', () => {
    render(<Sidebar {...defaultProps} />);

    fireEvent.click(screen.getByText('Pacientes'));
    expect(mockOnTabChange).toHaveBeenCalledWith('pacientes');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('deve chamar onAuditClick ao clicar em Auditoria e fechar o sidebar', () => {
    render(<Sidebar {...defaultProps} />);

    fireEvent.click(screen.getByText('Auditoria'));
    expect(mockOnAuditClick).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('deve chamar onBackupConfigClick ao clicar em Backup Cloud e fechar o sidebar', () => {
    render(<Sidebar {...defaultProps} />);

    fireEvent.click(screen.getByText('Backup Cloud'));
    expect(mockOnBackupConfigClick).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('deve chamar onLogoutClick ao clicar em Sair e fechar o sidebar', () => {
    render(<Sidebar {...defaultProps} />);

    fireEvent.click(screen.getByText('Sair'));
    expect(mockOnLogoutClick).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('deve destacar o item ativo na aba Auditoria', () => {
    render(<Sidebar {...defaultProps} activeTab="auditoria" />);

    const auditItem = screen.getByText('Auditoria').closest('button');
    expect(auditItem).toHaveClass('active');
  });

  test('deve chamar onClose ao clicar no botão fechar ou no backdrop', () => {
    const { container } = render(<Sidebar {...defaultProps} />);

    // Botão fechar (X)
    const closeButton = container.querySelector('.sidebar-close');
    if (closeButton) fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Backdrop
    const backdrop = container.querySelector('.sidebar-backdrop');
    if (backdrop) fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });
});
