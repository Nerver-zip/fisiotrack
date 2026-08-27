import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Patient } from '../types';
import { API_BASE_URL } from '../config';

interface UsePatientsProps {
  token: string | null;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

export type SortField = 'name' | 'last_eval' | 'updated_at' | 'is_favorite';

export function usePatients({ token, fetchWithAuth }: UsePatientsProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchPatients = useCallback(async (query: string = '') => {
    if (!token) return;
    try {
      if (isMounted.current) setLoading(true);
      const url = query
        ? `${API_BASE_URL}/api/patients?q=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/api/patients`;

      const response = await fetchWithAuth(url);
      if (!response.ok) throw new Error('Falha ao buscar pacientes');
      const data = await response.json();

      if (isMounted.current && token) {
        setPatients(Array.isArray(data) ? data : []);
        setError(null);
      }
      return data;
    } catch (err) {
      if (token && isMounted.current) setError('Erro ao conectar com o servidor.');
      return null;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [token, fetchWithAuth]);

  useEffect(() => {
    if (token) {
        fetchPatients();
    }
  }, [token, fetchPatients]);

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => {
      if (sortField === 'is_favorite') {
        const order = sortDirection === 'asc' ? 1 : -1;
        if (a.is_favorite !== b.is_favorite) {
          return a.is_favorite ? -1 * order : 1 * order;
        }
        return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()) * order;
      }

      let valA: string = '';
      let valB: string = '';

      if (sortField === 'name') {
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
      } else if (sortField === 'last_eval') {
        valA = a.evaluations?.[0]?.evaluation_date || '0000-00-00';
        valB = b.evaluations?.[0]?.evaluation_date || '0000-00-00';
      } else if (sortField === 'updated_at') {
        valA = a.updated_at || '0000-00-00 00:00:00';
        valB = b.updated_at || '0000-00-00 00:00:00';
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

  const toggleSort = (field: SortField) => {
    setCurrentPage(1);
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const setSort = (field: SortField, direction: 'asc' | 'desc') => {
    setCurrentPage(1);
    setSortField(field);
    setSortDirection(direction);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const toggleFavorite = async (patient: Patient) => {
    if (!patient.id) return;
    try {
      const updatedPatient = { ...patient, is_favorite: !patient.is_favorite };
      const response = await fetchWithAuth(`${API_BASE_URL}/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatient)
      });
      if (response.ok) {
        setPatients(prev => prev.map(p => p.id === patient.id ? { ...p, is_favorite: !p.is_favorite, updated_at: new Date().toISOString() } : p));
      }
    } catch (err) {
      console.error('Erro ao favoritar:', err);
    }
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
    setSort,
    renderSortIcon,
    fetchPatients,
    toggleFavorite
  };
}
