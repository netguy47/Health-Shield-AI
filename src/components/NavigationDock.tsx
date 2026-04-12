import React from 'react';
import { Activity, Database, MessageSquare, Cpu, Shield } from 'lucide-react';
import { View } from '@/lib/types';

interface NavigationDockProps {
  activeView: string;
  setActiveView: (view: View) => void;
  isPremium: boolean;
}

const NavigationDock: React.FC<NavigationDockProps> = ({ activeView, setActiveView, isPremium }) => {
  const navItems = [
    { id: 'HUB', label: 'HUB', icon: Activity },
    { id: 'DATA', label: 'DATA', icon: Database },
    { id: 'CONSULTANT', label: 'ADVISOR', icon: MessageSquare },
    { id: 'ORACLE', label: 'ORACLE', icon: Cpu, premium: true },
    { id: 'SAFE', label: 'SAFE', icon: Shield },
  ];

  return (
    <nav className="hs-dock-fixed" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      <div className="hs-dock" style={{ width: '95%', maxWidth: '500px', gap: '0.5rem', padding: '0.5rem' }}>
        {navItems.map((item) => {
          const isActive = activeView === item.id || (item.id === 'ORACLE' && activeView === 'ORACLE');
          const targetView = item.premium && !isPremium ? 'SAFE' : item.id;

          return (
            <button 
              key={item.id}
              onClick={() => setActiveView(targetView as View)} 
              className={`nav-item flex-1 ${isActive ? 'active' : ''}`}
              style={{ minWidth: '0' }}
            >
              <item.icon className="nav-icon" />
              <span className="hidden sm:inline" style={{ fontSize: '0.6rem' }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default NavigationDock;
