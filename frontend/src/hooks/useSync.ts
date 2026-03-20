import { useEffect, useRef, useCallback } from 'react';
import { SyncState } from '../components/common/SyncIcon';

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
    setSyncStatus('sincronizando');
    try {
      const res = await fetchWithAuth('http://localhost:8080/api/backup', { method: 'POST' });
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
      }, 5 * 60 * 1000); // 5 minutos
    }

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [syncStatus, handleBackup]);

  return {
    handleBackup
  };
}
