import { useState, useEffect, useRef, useCallback } from 'react';
import { SyncState } from '../components/common/SyncIcon';
import { API_BASE_URL } from '../config';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export function useAuth() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('fisio_token'));
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncState>('desconectado');
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/status`);
        if (!res.ok) throw new Error('status unavailable');
        const data = await res.json();
        if (isMounted.current) {
          setIsInitialized(Boolean(data.initialized));
          setLoginError(null);
        }
      } catch {
        if (isMounted.current) {
          setIsInitialized(null);
          setLoginError('Não foi possível conectar ao servidor da clínica.');
        }
      }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    if (!token) {
      if (isMounted.current) setSyncStatus('desconectado');
      return;
    }
    const checkCloudConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/backup/config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok && isMounted.current) {
          const config = await res.json();
          setSyncStatus(config.is_enabled && config.has_token ? 'pendente' : 'desconectado');
        }
      } catch (err) {
        console.error('Falha ao checar a configuração de backup', err);
      }
    };
    checkCloudConfig();
  }, [token]);

  const handleLogout = useCallback(() => {
    if (token) {
      fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    setToken(null);
    setLoginPassword('');
    setConfirmPassword('');
    localStorage.removeItem('fisio_token');
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setSyncStatus('desconectado');
  }, [token]);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    const res = await fetch(url, { ...options, headers });

    if (res.status === 401 && token) {
      handleLogout();
      throw new Error('Sessão expirada');
    }

    if (res.ok && options.method && ['POST', 'PUT', 'DELETE'].includes(options.method.toUpperCase())) {
      if (!url.includes('/api/backup') && !url.includes('/api/auth') && !url.includes('/api/login') && !url.includes('/api/logout')) {
        if (syncStatus !== 'desconectado') setSyncStatus('pendente');
      }
    }
    return res;
  }, [token, handleLogout, syncStatus]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword) {
      setLoginError('Informe a senha de acesso.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
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
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || 'Senha incorreta.');
      }
    } catch {
      setLoginError('Erro ao conectar com o servidor da clínica.');
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword !== confirmPassword) {
      setLoginError('As senhas não coincidem.');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(loginPassword)) {
      setLoginError('A senha deve ter pelo menos 8 caracteres, incluir letras maiúsculas, minúsculas e números.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/setup`, {
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
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || 'Erro ao configurar a instalação.');
      }
    } catch {
      setLoginError('Erro ao conectar com o servidor da clínica.');
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
    events.forEach(event => window.addEventListener(event, handleActivity));
    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
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
