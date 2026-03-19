import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from './Navbar';
import { SyncState } from '../common/SyncIcon';

describe('Navbar Component', () => {
  const mockOnMenuClick = jest.fn();
  const mockOnTabChange = jest.fn();
  const mockOnSyncClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve renderizar o logo e os links de navegação', () => {
    render(
      <Navbar 
        onMenuClick={mockOnMenuClick}
        syncStatus="sincronizado"
        activeTab="pacientes"
        onTabChange={mockOnTabChange}
      />
    );

    expect(screen.getByAltText(/FisioTrack/i)).toBeInTheDocument();
    expect(screen.getByText(/Pacientes/i)).toBeInTheDocument();
    expect(screen.getByText(/Agenda/i)).toBeInTheDocument();
    expect(screen.getByText(/Estatísticas/i)).toBeInTheDocument();
  });

  test('deve destacar a aba ativa', () => {
    const { rerender } = render(
      <Navbar 
        onMenuClick={mockOnMenuClick}
        syncStatus="sincronizado"
        activeTab="pacientes"
        onTabChange={mockOnTabChange}
      />
    );

    const pacientesLink = screen.getByText(/Pacientes/i).closest('button');
    expect(pacientesLink).toHaveClass('active');

    rerender(
      <Navbar 
        onMenuClick={mockOnMenuClick}
        syncStatus="sincronizado"
        activeTab="agenda"
        onTabChange={mockOnTabChange}
      />
    );

    const agendaLink = screen.getByText(/Agenda/i).closest('button');
    // Nota: Como 'Agenda' está desabilitado na implementação, 
    // a classe active pode não ser aplicada se o componente estiver desabilitado.
    // Mas vamos testar a lógica do activeTab.
    expect(agendaLink).toHaveClass('active');
  });

  test('deve chamar onTabChange ao clicar em uma aba (se habilitada)', () => {
    render(
      <Navbar 
        onMenuClick={mockOnMenuClick}
        syncStatus="sincronizado"
        activeTab="agenda"
        onTabChange={mockOnTabChange}
      />
    );

    const pacientesLink = screen.getByText(/Pacientes/i).closest('button');
    if (pacientesLink) fireEvent.click(pacientesLink);
    expect(mockOnTabChange).toHaveBeenCalledWith('pacientes');
  });

  test('deve chamar onMenuClick ao clicar no ícone de menu', () => {
    render(
      <Navbar 
        onMenuClick={mockOnMenuClick}
        syncStatus="sincronizado"
        activeTab="pacientes"
        onTabChange={mockOnTabChange}
      />
    );

    // O trigger do menu não tem texto, então buscamos pelo botão ou icon role se houver.
    // Lucide icons geralmente não tem role auto. Vamos buscar pelo botão que o envolve.
    const menuButton = screen.getByRole('button', { name: '' }); 
    // Se houver múltiplos, precisamos ser mais específicos. Navbar.tsx usa className="navbar-menu-trigger"
    // Mas como renderizamos isolado, só deve ter esse ou os nav-links.
    
    // Melhor buscar pelo elemento que tem a classe se necessário, mas getByRole costuma funcionar se for o único sem nome.
    const allButtons = screen.getAllByRole('button');
    const trigger = allButtons.find(b => b.classList.contains('navbar-menu-trigger'));
    if (trigger) fireEvent.click(trigger);
    
    expect(mockOnMenuClick).toHaveBeenCalledTimes(1);
  });
});
