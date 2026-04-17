import React from 'react';
import { 
  Activity, 
  Shield, 
  Database, 
  Cpu, 
  Layout, 
  Lock,
  Zap,
  ChevronRight
} from 'lucide-react';
import ScoreGauge from './ScoreGauge';

interface SovereignSidebarProps {
  activeView: string;
  setActiveView: (view: any) => void;
  isPremium: boolean;
  score: number;
  subscriptionTier: string;
}

const SovereignSidebar: React.FC<SovereignSidebarProps> = ({ 
  activeView, 
  setActiveView, 
  isPremium,
  score,
  subscriptionTier 
}) => {
  const navItems = [
    { id: 'HUB', icon: Layout, label: 'COMMAND' },
    { id: 'DATA', icon: Database, label: 'LEDGER' },
    { id: 'ORACLE', icon: Cpu, label: 'ORACLE', premium: true },
    { id: 'CONSULTANT', icon: Activity, label: 'CONSULTANT' },
    { id: 'SAFE', icon: Shield, label: 'VAULT' },
  ];

  return (
    <aside className="hs-sidebar-area" style={{ 
      height: '100vh', 
      borderRight: '1px solid rgba(110, 216, 195, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1rem',
      position: 'sticky',
      top: 0,
      background: 'rgba(5, 5, 5, 0.5)',
      backdropFilter: 'blur(40px)'
    }}>
      {/* Brand Section */}
      <div style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 1rem' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          background: 'var(--hs-primary)', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(110, 216, 195, 0.4)'
        }}>
          <Shield size={24} color="#050505" />
        </div>
        <div>
          <h2 className="technical" style={{ fontSize: '0.9rem', color: 'white', marginBottom: '2px' }}>HEALTHSHIELD</h2>
          <div className="hs-badge-secure" style={{ fontSize: '0.5rem', padding: '2px 6px' }}>
            <Lock size={8} /> {subscriptionTier.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            style={{
              all: 'unset',
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background: activeView === item.id ? 'rgba(110, 216, 195, 0.1)' : 'transparent',
              color: activeView === item.id ? 'var(--hs-primary)' : 'var(--hs-text-dim)',
              border: activeView === item.id ? '1px solid rgba(110, 216, 195, 0.2)' : '1px solid transparent'
            }}
          >
            <item.icon size={20} />
            <span className="technical" style={{ marginLeft: '12px', fontSize: '0.75rem', letterSpacing: '0.1em', flex: 1 }}>
              {item.label}
            </span>
            {item.premium && !isPremium && <Lock size={12} opacity={0.5} />}
            {activeView === item.id && <ChevronRight size={14} />}
          </button>
        ))}
      </nav>

      {/* Persistent Biometrics */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(110, 216, 195, 0.08)', paddingTop: '2rem' }}>
        <div style={{ 
          background: 'rgba(110, 216, 195, 0.03)', 
          borderRadius: '16px', 
          padding: '1rem',
          border: '1px solid rgba(110, 216, 195, 0.05)'
        }}>
          <div style={{ transform: 'scale(0.8)', margin: '-20px 0' }}>
            <ScoreGauge score={score} />
          </div>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <p className="technical" style={{ fontSize: '0.6rem', color: 'var(--hs-text-dim)' }}>NEURAL INTEGRITY</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
              <Zap size={10} color="var(--hs-primary)" />
              <span className="technical" style={{ fontSize: '0.7rem', color: 'var(--hs-primary)' }}>PROTOCOL ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SovereignSidebar;
