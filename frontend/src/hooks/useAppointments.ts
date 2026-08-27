import { useState, useCallback, useEffect, useRef } from 'react';
import { Appointment } from '../types';
import { API_BASE_URL } from '../config';

interface UseAppointmentsProps {
  token: string | null;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

export function useAppointments({ token, fetchWithAuth }: UseAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchAppointments = useCallback(async (date: string) => {
    if (!token) return;
    try {
      if (isMounted.current) setLoading(true);
      const url = `${API_BASE_URL}/api/appointments?date=${date}`;
      const response = await fetchWithAuth(url);
      if (!response.ok) throw new Error('Falha ao buscar agendamentos');
      const data = await response.json();
      if (isMounted.current) {
        setAppointments(Array.isArray(data) ? data : []);
        setError(null);
      }
    } catch (err) {
      if (isMounted.current) setError('Erro ao carregar agenda.');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [token, fetchWithAuth]);

  useEffect(() => {
    if (token) {
      fetchAppointments(currentDate);
    }
  }, [token, currentDate, fetchAppointments]);

  const addAppointment = async (appointment: Appointment) => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment)
      });
      if (!response.ok) throw new Error('Falha ao criar agendamento');
      fetchAppointments(currentDate);
      return true;
    } catch (err) {
      setError('Erro ao salvar agendamento.');
      return false;
    }
  };

  const updateAppointment = async (appointment: Appointment) => {
    if (!appointment.id) return false;
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/appointments/${appointment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment)
      });
      if (!response.ok) throw new Error('Falha ao atualizar agendamento');
      fetchAppointments(currentDate);
      return true;
    } catch (err) {
      setError('Erro ao atualizar agendamento.');
      return false;
    }
  };

  const deleteAppointment = async (id: number) => {
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/appointments/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Falha ao excluir agendamento');
      fetchAppointments(currentDate);
      return true;
    } catch (err) {
      setError('Erro ao excluir agendamento.');
      return false;
    }
  };

  const checkConflicts = (newAppt: Partial<Appointment>) => {
    if (!newAppt.appointment_time || !newAppt.duration_minutes) return [];

    const start = timeToMinutes(newAppt.appointment_time);
    const end = start + newAppt.duration_minutes;

    return appointments.filter(a => {
      if (a.id === newAppt.id) return false;
      if (a.status === 'cancelled') return false;
      const aStart = timeToMinutes(a.appointment_time);
      const aEnd = aStart + a.duration_minutes;
      return (start < aEnd && end > aStart);
    });
  };

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  return {
    appointments,
    loading,
    error,
    currentDate,
    setCurrentDate,
    fetchAppointments,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    checkConflicts
  };
}
