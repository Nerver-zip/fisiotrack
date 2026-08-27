import React from 'react';
import { User, ClipboardList, LogOut, X, Cloud, Users, Calendar, BarChart3, FileDown } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAuditClick: () => void;
  onBackupConfigClick: () => void;
  onExportClick: () => void;
  onLogoutClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  userName,
  activeTab,
  onTabChange,
  onAuditClick,
  onBackupConfigClick,
  onExportClick,
  onLogoutClick
}) => {
  return (
    <>
      <div className={`sidebar-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="sidebar-close" onClick={onClose}>
            <X size={24} />
          </button>
          <div className="user-profile">
            <div className="user-avatar">
              <User size={40} />
            </div>
            <div className="user-info-text">
              <span className="user-name">{userName}</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Items que só aparecem no Sidebar no Mobile (pois saem da Navbar) */}
          <div className="mobile-only-nav">
            <button
              className={`sidebar-item ${activeTab === 'pacientes' ? 'active' : ''}`}
              onClick={() => { onTabChange('pacientes'); onClose(); }}
            >
              <Users size={20} />
              <span>Pacientes</span>
            </button>
            <button
              className={`sidebar-item ${activeTab === 'agenda' ? 'active' : ''}`}
              onClick={() => { onTabChange('agenda'); onClose(); }}
            >
              <Calendar size={20} />
              <span>Agenda</span>
            </button>
            <button
              className={`sidebar-item ${activeTab === 'estatisticas' ? 'active' : ''}`}
              onClick={() => { onTabChange('estatisticas'); onClose(); }}
              disabled
              style={{ opacity: 0.5 }}
            >
              <BarChart3 size={20} />
              <span>Estatísticas</span>
            </button>
            <hr className="sidebar-divider" />
          </div>

          <button className={`sidebar-item ${activeTab === 'auditoria' ? 'active' : ''}`} onClick={() => { onAuditClick(); onClose(); }}>
            <ClipboardList size={20} />
            <span>Auditoria</span>
          </button>
          <button className={`sidebar-item ${activeTab === 'ajustes' ? 'active' : ''}`} onClick={() => { onBackupConfigClick(); onClose(); }}>
            <Cloud size={20} />
            <span>Backup Cloud</span>
          </button>
          <button className="sidebar-item" onClick={() => { onExportClick(); onClose(); }}>
            <FileDown size={20} />
            <span>Exportar JSON</span>
          </button>
          <hr className="sidebar-divider" />
          <button className="sidebar-item logout" onClick={() => { onLogoutClick(); onClose(); }}>
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <span>FisioTrack v2.0</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
