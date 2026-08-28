import React, { useEffect, useState } from 'react';
import { Cloud, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface CloudConfig {
  provider: string;
  folder_id: string;
  is_enabled: boolean;
  has_token: boolean;
}

interface BackupConfigViewProps {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const BackupConfigView: React.FC<BackupConfigViewProps> = ({ fetchWithAuth }) => {
  const [config, setConfig] = useState<CloudConfig>({
    provider: 'google_drive',
    folder_id: '',
    is_enabled: false,
    has_token: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/backup/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Erro ao carregar config de nuvem', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!config.has_token) {
        setMessage({ type: 'error', text: 'Conecte sua conta do Google Drive primeiro.' });
        return;
    }
    const newEnabled = !config.is_enabled;
    await saveConfig({ ...config, is_enabled: newEnabled });
  };

  const saveConfig = async (newConfig: CloudConfig) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/backup/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        setConfig(newConfig);
        setMessage({ type: 'success', text: 'Configuração salva com sucesso!' });
      } else {
        setMessage({ type: 'error', text: 'Erro ao salvar configuração.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão ao salvar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectDrive = async () => {
    setMessage(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/backup/auth/url`);
      if (res.ok) {
        const { url } = await res.json();
        // Redirecionar a aba atual para o Google (mais confiável que window.open)
        window.location.href = url;
      } else {
        const errorData = await res.json().catch(() => ({}));
        setMessage({
          type: 'error',
          text: errorData.error || 'Erro ao obter URL de autenticação do backend.'
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Falha ao iniciar autenticação Google.' });
    }
  };

  const handleAuthCode = async (code: string) => {
    setLoading(true);
    try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/backup/auth/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        if (res.ok) {
            setMessage({ type: 'success', text: 'Google Drive conectado com sucesso!' });
            loadConfig();
        } else {
            const errData = await res.json();
            setMessage({ type: 'error', text: `Erro na autenticação: ${errData.error || 'Falha desconhecida'}` });
        }
    } catch (err) {
        setMessage({ type: 'error', text: 'Erro ao enviar código de autorização.' });
    } finally {
        setLoading(false);
    }
  };

  if (loading) return <div className="card"><p>Carregando configurações de nuvem...</p></div>;

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0.5rem auto 3rem auto' }}>

      <div className="view-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2><Cloud size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Backup em Nuvem</h2>
        <p className="text-secondary">Mantenha seus prontuários seguros no seu próprio Google Drive.</p>
      </div>

      <div className="view-body">
        {message && (
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            backgroundColor: message.type === 'success' ? '#dff0d8' : '#f2dede',
            color: message.type === 'success' ? '#3c763d' : '#a94442',
            border: `1px solid ${message.type === 'success' ? '#d6e9c6' : '#ebccd1'}`
          }}>
            {message.text}
          </div>
        )}

        <div className="settings-section" style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #eee', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Google Drive</h3>
            {config.has_token ? (
              <span style={{ display: 'flex', alignItems: 'center', color: '#2ecc71', fontWeight: 'bold' }}>
                <CheckCircle size={18} style={{ marginRight: '5px' }} /> Conectado
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', color: '#e74c3c', fontWeight: 'bold' }}>
                <XCircle size={18} style={{ marginRight: '5px' }} /> Desconectado
              </span>
            )}
          </div>

          {!config.has_token ? (
            <button
              onClick={handleConnectDrive}
              className="btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ExternalLink size={18} style={{ marginRight: '8px' }} /> Conectar Conta do Google
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleConnectDrive}
                className="btn-outline"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <RefreshCw size={18} style={{ marginRight: '8px' }} /> Re-conectar
              </button>
              <button
                onClick={handleToggleEnabled}
                className={config.is_enabled ? "btn-danger" : "btn-primary"}
                style={{ flex: 1 }}
              >
                {config.is_enabled ? "Desativar Backup" : "Ativar Backup Automático"}
              </button>
            </div>
          )}
        </div>

        {config.has_token && (
          <div className="settings-section" style={{ padding: '1.5rem', border: '1px solid #eee', borderRadius: '12px' }}>
            <div className="form-group">
              <label htmlFor="folder_id">ID da Pasta no Google Drive (Opcional)</label>
              <input
                type="text"
                id="folder_id"
                placeholder="Ex: 1abcd-2efgh-3ijkl"
                value={config.folder_id}
                onChange={(e) => setConfig({ ...config, folder_id: e.target.value })}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                Se vazio, os backups serão salvos na raiz do seu Google Drive.
              </p>
            </div>

            <button
              onClick={() => saveConfig(config)}
              disabled={saving}
              className="btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupConfigView;
