import { useState, useEffect, useMemo, useCallback } from 'react';
import { Patient, Evaluation } from '../types';

interface UsePatientsProps {
  token: string | null;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

export function usePatients({ token, fetchWithAuth }: UsePatientsProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [sortField, setSortField] = useState<'name' | 'last_eval'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchPatients = useCallback(async (query: string = '') => {
    if (!token) return;
    try {
      setLoading(true);
      const url = query 
        ? `http://localhost:8080/api/patients?q=${encodeURIComponent(query)}`
        : `http://localhost:8080/api/patients`;
      
      const response = await fetchWithAuth(url);
      if (!response.ok) throw new Error('Falha ao buscar pacientes');
      const data = await response.json();
      setPatients(data);
      setError(null);
    } catch (err) {
      if (token) setError('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  }, [token, fetchWithAuth]);

  useEffect(() => {
    if (token) fetchPatients();
  }, [token, fetchPatients]);

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => {
      let valA: string = '';
      let valB: string = '';

      if (sortField === 'name') {
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
      } else if (sortField === 'last_eval') {
        valA = a.evaluations?.[0]?.evaluation_date || '0000-00-00';
        valB = b.evaluations?.[0]?.evaluation_date || '0000-00-00';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [patients, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedPatients.length / itemsPerPage);
  
  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedPatients.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedPatients, currentPage]);

  const toggleSort = (field: 'name' | 'last_eval') => {
    setCurrentPage(1);
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: 'name' | 'last_eval') => {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return {
    patients,
    setPatients,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedPatients,
    sortField,
    sortDirection,
    toggleSort,
    renderSortIcon,
    fetchPatients
  };
}
