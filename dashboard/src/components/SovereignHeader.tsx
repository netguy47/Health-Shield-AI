import React from 'react';
import { Activity, Lock, Plus } from 'lucide-react';

interface SovereignHeaderProps {
  subscriptionTier: string;
  trialDaysRemaining: number | null;
  onShowDevMenu: () => void;
  onShowSensor: () => void;
}

const SovereignHeader: React.FC<SovereignHeaderProps> = ({ 
  subscriptionTier, 
  trialDaysRemaining, 
  onShowDevMenu,
  onShowSensor 
}) => {
  const isTrial = trialDaysRemaining !== null;
  
  return (
    <header className="hs-header">
      <div className="hs-logo-container">
        <Activity className="nav-icon" style={{ color: 'var(--hs-primary)' }} />
        <h1 className="technical" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.1em' }}>
          HEALTHSHIELD <span style={{ color: 'var(--hs-primary)' }}>AI</span>
        </h1>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button 
          className="hs-badge-secure" 
          onClick={onShowSensor}
          style={{ 
            background: 'rgba(0, 242, 255, 0.1)', 
            color: 'var(--hs-primary)', 
            cursor: 'pointer',
            padding: '6px 12px'
          }}
        >
          <Plus size={16} />
          <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>PULSE</span>
        </button>

        {isTrial && (
          <div className="hs-badge-secure" style={{ background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b', borderColor: 'rgba(255, 107, 107, 0.3)' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 900 }}>TRIAL: {trialDaysRemaining}D</span>
          </div>
        )}
        
        <div 
          className="hs-badge-secure" 
          onClick={onShowDevMenu}
          title="Protocol Security Baseline"
        >
          <Lock size={12} />
          <span>{subscriptionTier === 'lifetime' ? 'LIFETIME SOVEREIGN' : 'AES-256 SOVEREIGN'}</span>
        </div>
      </div>
    </header>
  );
};

export default SovereignHeader;
