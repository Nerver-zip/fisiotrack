import { useState, useEffect, useRef, useCallback } from 'react';
import { SyncState } from '../components/common/SyncIcon';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

export function useAuth() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('fisio_token'));
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncState>('sincronizado');
  
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/auth/status');
      const data = await res.json();
      setIsInitialized(data.initialized);
    } catch (err) {
      setLoginError('Não foi possível conectar ao servidor backend.');
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleLogout = useCallback(() => {
    if (token) {
      fetch('http://localhost:8080/api/logout', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
    setToken(null);
    setLoginPassword('');
    setConfirmPassword('');
    localStorage.removeItem('fisio_token');
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setSyncStatus('sincronizado');
  }, [token]);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 401 && token) {
      handleLogout();
      throw new Error('Sessão expirada');
    }

    // Intercepter mutações para o Smart Auto-Sync
    if (res.ok && options.method && ['POST', 'PUT', 'DELETE'].includes(options.method.toUpperCase())) {
      if (!url.includes('/api/backup') && !url.includes('/api/auth') && !url.includes('/api/login') && !url.includes('/api/logout')) {
        setSyncStatus('pendente');
      }
    }

    return res;
  }, [token, handleLogout]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8080/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        localStorage.setItem('fisio_token', data.token);
        setLoginError(null);
      } else {
        setLoginError('Senha incorreta.');
      }
    } catch (err) {
      setLoginError('Erro ao conectar com o servidor.');
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword !== confirmPassword) {
      setLoginError('As senhas não coincidem.');
      return;
    }
    if (loginPassword.length < 6) {
      setLoginError('A senha deve ter pelo menos 6 caracteres para segurança.');
      return;
    }

    try {
      const res = await fetch('http://localhost:8080/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        localStorage.setItem('fisio_token', data.token);
        setIsInitialized(true);
        setLoginError(null);
      } else {
        const data = await res.json();
        setLoginError(data.error || 'Erro ao configurar o sistema.');
      }
    } catch (err) {
      setLoginError('Erro ao conectar com o servidor.');
    }
  };

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (token) {
      idleTimerRef.current = setTimeout(() => {
        handleLogout();
        alert('Sessão expirada por inatividade. Por favor, faça login novamente.');
      }, IDLE_TIMEOUT_MS);
    }
  }, [token, handleLogout]);

  useEffect(() => {
    if (!token) return;
    resetIdleTimer();
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    const handleActivity = () => resetIdleTimer();
    events.forEach(e => window.addEventListener(e, handleActivity));
    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [token, resetIdleTimer]);

  return {
    token,
    isInitialized,
    loginPassword,
    setLoginPassword,
    confirmPassword,
    setConfirmPassword,
    loginError,
    syncStatus,
    setSyncStatus,
    handleLogin,
    handleSetup,
    handleLogout,
    fetchWithAuth
  };
}
