import React from 'react';
import { User, ClipboardList, LogOut, X } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onAuditClick: () => void;
  onLogoutClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  userName,
  onAuditClick,
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
              <span className="user-role">Fisioterapeuta</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="sidebar-item" onClick={() => { onAuditClick(); onClose(); }}>
            <ClipboardList size={20} />
            <span>Auditoria</span>
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
