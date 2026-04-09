import React from 'react';
import { Activity, Database, MessageSquare, Cpu, Shield } from 'lucide-react';

interface NavigationDockProps {
  activeView: string;
  setActiveView: (view: any) => void;
  isPremium: boolean;
}

const NavigationDock: React.FC<NavigationDockProps> = ({ activeView, setActiveView, isPremium }) => {
  return (
    <nav className="hs-dock-fixed">
      <div className="hs-dock">
        <button onClick={() => setActiveView('HUB')} className={`nav-item ${activeView === 'HUB' ? 'active' : ''}`}>
          <Activity className="nav-icon" />
          <span>HUB</span>
        </button>
        <button onClick={() => setActiveView('DATA')} className={`nav-item ${activeView === 'DATA' ? 'active' : ''}`}>
          <Database className="nav-icon" />
          <span>DATA</span>
        </button>
        <button onClick={() => setActiveView('CONSULTANT')} className={`nav-item ${activeView === 'CONSULTANT' ? 'active' : ''}`}>
          <MessageSquare className="nav-icon" />
          <span>ADVISOR</span>
        </button>
        <button 
          onClick={() => isPremium ? setActiveView('ORACLE') : setActiveView('SAFE')} 
          className={`nav-item ${activeView === 'ORACLE' ? 'active' : ''}`}
        >
          <Cpu className="nav-icon" />
          <span>ORACLE</span>
        </button>
        <button onClick={() => setActiveView('SAFE')} className={`nav-item ${activeView === 'SAFE' ? 'active' : ''}`}>
          <Shield className="nav-icon" />
          <span>SAFE</span>
        </button>
      </div>
    </nav>
  );
};

export default NavigationDock;
