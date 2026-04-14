import React, { useState } from 'react';
import { Key, RefreshCw, Check, X, ShieldAlert } from 'lucide-react';

interface LicenseManagerProps {
  onSuccess: (tier: string) => void;
  onClose: () => void;
}

const LicenseManager: React.FC<LicenseManagerProps> = ({ onSuccess, onClose }) => {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = async () => {
    if (!key.trim()) return;
    
    setStatus('verifying');
    setErrorMsg('');

    try {
      const response = await fetch('/api/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key.trim() })
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setStatus('success');
        // Store in localStorage for persistence (Sovereign Node requirement)
        localStorage.setItem('healthshield_protocol_level', data.tier);
        setTimeout(() => {
          onSuccess(data.tier);
        }, 1500);
      } else {
        setStatus('error');
        setErrorMsg(data.message || 'Invalid License Key. Verify and retry.');
      }
    } catch (err) {
      console.error('Verification Error:', err);
      setStatus('error');
      setErrorMsg('Node Connection Failed. Check your network.');
    }
  };

  return (
    <div className="obsidian-card" style={{ maxWidth: '400px', width: '90%', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 className="technical" style={{ fontSize: '1rem', color: 'var(--hs-primary)' }}>ACTIVATE SOVEREIGN LICENSE</h3>
        <X size={20} style={{ cursor: 'pointer', color: '#849495' }} onClick={onClose} />
      </div>

      <p style={{ fontSize: '0.75rem', color: '#849495', marginBottom: '1.5rem', lineHeight: 1.5 }}>
        Enter the secure license key emailed to you after purchase to unlock the clinical intelligence layer.
      </p>

      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <input 
          type="text"
          placeholder="HS-V1-XXXX-XXXX"
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase())}
          disabled={status === 'verifying' || status === 'success'}
          style={{ 
            width: '100%', 
            background: '#0a0a0b', 
            border: `1px solid ${status === 'error' ? '#ff5050' : 'rgba(110, 216, 195, 0.2)'}`, 
            padding: '16px', 
            borderRadius: '4px',
            color: '#fff',
            fontSize: '1rem',
            fontFamily: 'monospace',
            letterSpacing: '1px'
          }}
        />
        <Key size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(110, 216, 195, 0.5)' }} />
      </div>

      {status === 'error' && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1.5rem', color: '#ff5050', fontSize: '0.7rem' }}>
          <ShieldAlert size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      {status === 'success' && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1.5rem', color: 'var(--hs-primary)', fontSize: '0.7rem' }}>
          <Check size={14} />
          <span>LICENSE AUTHENTICATED. INITIALIZING PRO STACK...</span>
        </div>
      )}

      <button 
        onClick={handleVerify}
        disabled={status === 'verifying' || status === 'success' || !key.trim()}
        className="hs-btn-primary"
        style={{ padding: '16px' }}
      >
        {status === 'verifying' ? (
          <RefreshCw size={18} className="spin" />
        ) : status === 'success' ? (
          <Check size={18} />
        ) : (
          'AUTHENTICATE NODE'
        )}
      </button>

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <a 
          href="https://healthshield-ai.com/support" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ fontSize: '0.6rem', color: '#849495', textDecoration: 'none' }}
        >
          Lost your key? Contact Intelligence Support
        </a>
      </div>
    </div>
  );
};

export default LicenseManager;
