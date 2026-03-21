import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PatientsView from './PatientsView';
import { Patient } from '../../types';

const mockPatients: Patient[] = [
  { 
    id: 1, 
    name: 'Alice', 
    is_favorite: true, 
    updated_at: '2024-03-20T10:00:00Z',
    healthcare_id: 'H1',
    mom_name: 'Mom1',
    birth_date: '1990-01-01',
    cpf: '111.111.111-11',
    gender: 'Feminino',
    address: 'Endereço 1',
    profession: 'Prof 1',
    phone: ['1111-1111'],
    evaluations: [{ evaluation_date: '2024-03-10', medical_diagnosis: 'D1' } as any]
  },
  { 
    id: 2, 
    name: 'Bob', 
    is_favorite: false, 
    updated_at: '2024-03-19T10:00:00Z',
    healthcare_id: 'H2',
    mom_name: 'Mom2',
    birth_date: '1980-01-01',
    cpf: '222.222.222-22',
    gender: 'Masculino',
    address: 'Endereço 2',
    profession: 'Prof 2',
    phone: ['2222-2222'],
    evaluations: [] 
  }
];

describe('PatientsView', () => {
  const defaultProps = {
    searchTerm: '',
    setSearchTerm: jest.fn(),
    onSearch: jest.fn(),
    onNewPatient: jest.fn(),
    onImportJson: jest.fn(),
    error: null,
    loading: false,
    paginatedPatients: mockPatients,
    toggleSort: jest.fn(),
    setSort: jest.fn(),
    sortField: 'name' as any,
    sortDirection: 'asc' as any,
    renderSortIcon: jest.fn(() => '↕'),
    onViewDetail: jest.fn(),
    onDeletePatient: jest.fn(),
    onToggleFavorite: jest.fn(),
    currentPage: 1,
    totalPages: 1,
    setCurrentPage: jest.fn(),
    fetchWithAuth: jest.fn()
  };

  test('deve renderizar os cabeçalhos corretamente', () => {
    render(<PatientsView {...defaultProps} />);
    expect(screen.getByText(/Nome/i)).toBeInTheDocument();
    expect(screen.getByText(/Última Entrada/i)).toBeInTheDocument();
    expect(screen.getByText(/Diagnóstico/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Última Modificação/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Classificação/i)).toBeInTheDocument();
  });

  test('deve destacar pacientes favoritos', () => {
    const { container } = render(<PatientsView {...defaultProps} />);
    const rows = container.querySelectorAll('tr.patient-row');
    expect(rows[0]).toHaveClass('favorite');
    expect(rows[1]).not.toHaveClass('favorite');
  });

  test('deve abrir o menu de classificação ao clicar no cabeçalho correspondente', () => {
    render(<PatientsView {...defaultProps} />);
    const classificationHeader = screen.getByText(/Classificação/i);
    fireEvent.click(classificationHeader);
    
    expect(screen.getByText(/ORDENAR POR/i)).toBeInTheDocument();
    expect(screen.getByText(/Favoritos/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Última Modificação/i).length).toBe(2);
  });

  test('deve chamar setSort com os parâmetros corretos ao selecionar uma opção no dropdown', () => {
    render(<PatientsView {...defaultProps} />);
    fireEvent.click(screen.getByText(/Classificação/i));
    
    const favRow = screen.getByText('Favoritos').closest('.sort-dropdown-item');
    const ascButton = favRow?.querySelector('button[title="Ordem Ascendente"]');
    
    if (ascButton) fireEvent.click(ascButton);
    expect(defaultProps.setSort).toHaveBeenCalledWith('is_favorite', 'asc');
  });

  test('deve chamar onToggleFavorite ao clicar na estrela', () => {
    render(<PatientsView {...defaultProps} />);
    const favoriteButtons = screen.getAllByTitle(/favoritos/i);
    fireEvent.click(favoriteButtons[0]);
    expect(defaultProps.onToggleFavorite).toHaveBeenCalledWith(mockPatients[0]);
  });
});
