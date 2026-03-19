import React from 'react';
import { Menu, Calendar, Users, BarChart3 } from 'lucide-react';
import SyncIcon, { SyncState } from '../common/SyncIcon';
import './Navbar.css';

interface NavbarProps {
  onMenuClick: () => void;
  syncStatus: SyncState;
  onSyncClick?: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  onMenuClick, 
  syncStatus, 
  onSyncClick,
  activeTab,
  onTabChange
}) => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img src="/assets/logo.jpg" alt="FisioTrack" className="navbar-logo" />
      </div>

      <div className="navbar-center">
        <button 
          className={`nav-link ${activeTab === 'pacientes' ? 'active' : ''}`}
          onClick={() => onTabChange('pacientes')}
        >
          <Users size={20} />
          <span>Pacientes</span>
        </button>
        <button 
          className={`nav-link ${activeTab === 'agenda' ? 'active' : ''}`}
          onClick={() => onTabChange('agenda')}
          disabled // Not implemented yet
        >
          <Calendar size={20} />
          <span>Agenda</span>
        </button>
        <button 
          className={`nav-link ${activeTab === 'estatisticas' ? 'active' : ''}`}
          onClick={() => onTabChange('estatisticas')}
          disabled // Not implemented yet
        >
          <BarChart3 size={20} />
          <span>Estatísticas</span>
        </button>
      </div>

      <div className="navbar-right">
        <div 
          className="sync-wrapper"
          style={{ cursor: syncStatus === 'erro' ? 'pointer' : 'default' }} 
          onClick={onSyncClick}
        >
          <SyncIcon state={syncStatus} size={28} />
        </div>
        <button className="navbar-menu-trigger" onClick={onMenuClick}>
          <Menu size={28} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
