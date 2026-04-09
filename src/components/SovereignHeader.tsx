import React from 'react';
import { Activity, Lock } from 'lucide-react';

const SovereignHeader: React.FC = () => {
  return (
    <header className="hs-header">
      <div className="hs-logo-container">
        <Activity className="nav-icon" style={{ color: 'var(--hs-primary)' }} />
        <h1 className="technical" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.1em' }}>
          HEALTHSHIELD <span style={{ color: 'var(--hs-primary)' }}>AI</span>
        </h1>
      </div>
      <div className="hs-badge-secure">
        <Lock size={12} />
        <span>AES-256 SOVEREIGN</span>
      </div>
    </header>
  );
};

export default SovereignHeader;
