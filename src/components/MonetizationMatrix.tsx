import React from 'react';
import { Download, ChevronRight, Zap } from 'lucide-react';

interface MonetizationMatrixProps {
  handlePurchase: (plan: string) => void;
  handleInstall: () => void;
  deferredPrompt: any;
  isPremium: boolean;
}

const MonetizationMatrix: React.FC<MonetizationMatrixProps> = ({ handlePurchase, handleInstall, deferredPrompt, isPremium }) => {
  if (isPremium) return null;

  return (
    <div className="hs-grid">
      {/* 1. Scarcity & Social Anchor */}
      <section className="obsidian-card col-span-12" style={{ background: 'rgba(0, 242, 255, 0.03)', border: '1px solid rgba(0, 242, 255, 0.1)' }}>
        <div className="hs-grid">
          <div className="col-span-12 pc-col-span-8">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
              <Zap size={14} style={{ color: '#00F2FF' }} />
              <span className="technical" style={{ color: '#00F2FF', fontSize: '0.7rem' }}>GENESIS NODE PROGRAM: 4 SLOTS REMAINING</span>
            </div>
            <h2 className="technical" style={{ color: '#FFF', fontSize: '1.2rem', marginBottom: '0.5rem' }}>UNLOCK THE SOVEREIGN ARCHIVE</h2>
            <p style={{ color: '#849495', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Transition from basic logging to high-fidelity hemodynamic trajectory projection.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Tier Matrix */}
      <div className="obsidian-card col-span-12 pc-col-span-4" style={{ height: 'fit-content' }}>
        <div className="hs-badge-secure" style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', color: '#fff' }}>BASIC ACCESS</div>
        <h3 className="technical" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>FREE</h3>
        <ul style={{ color: '#849495', fontSize: '0.8rem', paddingLeft: '1rem', marginBottom: '2rem', listStyleType: 'circle' }}>
          <li style={{ marginBottom: '0.5rem' }}>Optical BPM Sensing</li>
          <li style={{ marginBottom: '0.5rem' }}>Local Data Persistence</li>
        </ul>
        <button className="hs-badge-secure" style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }}>CURRENT PLAN</button>
      </div>

      <div className="obsidian-card col-span-12 pc-col-span-4" style={{ border: '1px solid var(--hs-primary)', background: 'rgba(110, 216, 195, 0.05)', transform: 'scale(1.02)' }}>
        <div className="scan-line"></div>
        <div className="hs-badge-secure" style={{ marginBottom: '1rem', background: 'var(--hs-primary)', color: '#000' }}>RECOMMENDED</div>
        <h3 className="technical" style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>$79.00 / YR</h3>
        <p className="technical" style={{ fontSize: '0.6rem', color: 'var(--hs-primary)', marginBottom: '1.5rem' }}>SAVE 34% VS MONTHLY</p>
        <ul style={{ color: 'var(--hs-text)', fontSize: '0.8rem', paddingLeft: '1rem', marginBottom: '2rem', listStyleType: 'circle' }}>
          <li style={{ marginBottom: '0.5rem' }}>72hr Trajectory Projection</li>
          <li style={{ marginBottom: '0.5rem' }}>Sovereign Consultant AI</li>
          <li style={{ marginBottom: '0.5rem' }}>Cloud-Sync Encrypted Storage</li>
        </ul>
        <button 
          onClick={() => handlePurchase('yearly')}
          className="hs-badge-secure" 
          style={{ width: '100%', background: 'var(--hs-primary)', color: '#000', cursor: 'pointer' }}
        >
          ACTIVATE YEARLY NODE
        </button>
      </div>

      <div className="obsidian-card col-span-12 pc-col-span-4">
        <div className="hs-badge-secure" style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>LIFETIME</div>
        <h3 className="technical" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>$199.00</h3>
        <ul style={{ color: '#849495', fontSize: '0.8rem', paddingLeft: '1rem', marginBottom: '2rem', listStyleType: 'circle' }}>
          <li style={{ marginBottom: '0.5rem' }}>One-time Genesis License</li>
          <li style={{ marginBottom: '0.5rem' }}>All Future Core Updates</li>
          <li style={{ marginBottom: '0.5rem' }}>Exclusive HUD Modules</li>
        </ul>
        <button 
          onClick={() => handlePurchase('lifetime')}
          className="hs-badge-secure" 
          style={{ width: '100%', background: '#fff', color: '#000', cursor: 'pointer' }}
        >
          OWN SOVEREIGN NODE
        </button>
      </div>

      {/* 3. PWA Anchor */}
      <div className="obsidian-card col-span-12" style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Download size={32} style={{ color: 'var(--hs-primary)', marginBottom: '1rem' }} />
          <h4 className="technical">MOBILE INSTRUMENT MODE</h4>
          <p style={{ color: '#849495', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            Install HealthShield AI as a standalone PWA for sensor-grid stability and offline monitoring.
          </p>
          <button 
            onClick={handleInstall}
            className="hs-badge-secure"
            style={{ border: '1px solid var(--hs-primary)', color: 'var(--hs-primary)', cursor: 'pointer' }}
          >
            {deferredPrompt ? 'INSTALL TO HOME SCREEN' : 'PWA MODE READY'}
          </button>
      </div>
    </div>
  );
};

export default MonetizationMatrix;
