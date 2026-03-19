import React from 'react';
import { CheckCircle2, XCircle, RefreshCw, Cloud } from 'lucide-react';
import './SyncIcon.css';

export type SyncState = 'sincronizado' | 'pendente' | 'sincronizando' | 'erro';

interface SyncIconProps {
  state: SyncState;
  size?: number;
}

// Ícone customizado de relógio com ponteiro animado
const AnimatedClock: React.FC<{ size: number }> = ({ size }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="sync-icon-overlay icon-pendente"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="12" x2="12" y2="7" className="clock-hand" />
    <line x1="12" y1="12" x2="15" y2="15" opacity="0.5" />
  </svg>
);

const SyncIcon: React.FC<SyncIconProps> = ({ state, size = 48 }) => {
  const getTitle = () => {
    switch (state) {
      case 'sincronizado': return 'Backup na nuvem atualizado';
      case 'pendente': return 'Alterações pendentes para sincronização';
      case 'sincronizando': return 'Sincronizando com o Google Drive...';
      case 'erro': return 'Erro na sincronização. Clique para tentar novamente.';
      default: return '';
    }
  };

  const getOverlayIcon = () => {
    const overlaySize = size * 0.45; // Proporção do status em relação à nuvem
    switch (state) {
      case 'sincronizado':
        return <CheckCircle2 className="sync-icon-overlay icon-sincronizado" size={overlaySize} />;
      case 'pendente':
        return <AnimatedClock size={overlaySize} />;
      case 'sincronizando':
        return <RefreshCw className="sync-icon-overlay icon-sincronizando spinning" size={overlaySize} />;
      case 'erro':
        return <XCircle className="sync-icon-overlay icon-erro" size={overlaySize} />;
      default:
        return null;
    }
  };

  return (
    <div 
      className={`sync-container state-${state}`} 
      style={{ width: size, height: size, position: 'relative' }}
      title={getTitle()}
    >
      {/* Nuvem de fundo comum a todos os estados */}
      <Cloud className="sync-icon-bg" size={size} style={{ position: 'absolute' }} />
      
      {/* Overlay de status no canto inferior direito */}
      <div className="overlay-wrapper" style={{ 
        position: 'absolute', 
        bottom: '0', 
        right: '0',
        background: 'transparent',
        lineHeight: 0
      }}>
        {getOverlayIcon()}
      </div>
    </div>
  );
};

export default SyncIcon;
