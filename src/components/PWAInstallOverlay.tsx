import React from 'react';
import { Download } from 'lucide-react';

interface PWAInstallOverlayProps {
  deferredPrompt: any;
  handleInstall: () => void;
}

const PWAInstallOverlay: React.FC<PWAInstallOverlayProps> = ({ deferredPrompt, handleInstall }) => {
  if (!deferredPrompt) return null;

  return (
    <div style={{ position: 'fixed', bottom: '100px', left: '1.5rem', right: '1.5rem', zIndex: 1100 }}>
      <div className="obsidian-card" style={{ background: '#00F2FF', color: '#050505', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Download size={20} />
          <span className="technical" style={{ fontWeight: 700, fontSize: '0.8rem' }}>INSTALL SOVEREIGN HUB</span>
        </div>
        <button 
          onClick={handleInstall} 
          style={{ background: '#050505', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
        >
          GET APP
        </button>
      </div>
    </div>
  );
};

export default PWAInstallOverlay;
