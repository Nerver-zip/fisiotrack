import { useEffect, useRef, useCallback } from 'react';
import { SyncState } from '../components/common/SyncIcon';
import { API_BASE_URL } from '../config';

interface UseSyncProps {
  token: string | null;
  syncStatus: SyncState;
  setSyncStatus: (state: SyncState) => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

export function useSync({ token, syncStatus, setSyncStatus, fetchWithAuth }: UseSyncProps) {
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleBackup = useCallback(async () => {
    if (!token) return;
    if (syncStatus === 'sincronizando') return;
    if (syncStatus === 'desconectado') {
        alert('Configure o Backup Cloud primeiro.');
        return;
    }

    if (syncStatus === 'sincronizado') {
        if (!window.confirm('O sistema já está sincronizado. Forçar um novo backup agora?')) {
            return;
        }
    }

    setSyncStatus('sincronizando');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/backup`, { method: 'POST' });
      if (res.ok) {
        setSyncStatus('sincronizado');
      } else {
        setSyncStatus('erro');
      }
    } catch (err) {
      setSyncStatus('erro');
    }
  }, [token, fetchWithAuth, setSyncStatus]);

  useEffect(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    if (syncStatus === 'pendente') {
      syncTimerRef.current = setTimeout(() => {
        handleBackup();
      }, 30 * 1000); // 30 segundos
    }

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [syncStatus, handleBackup]);

  return {
    handleBackup
  };
}
