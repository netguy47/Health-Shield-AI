import React from 'react';
import { ShieldCheck, Zap, Download, Lock, CheckCircle2 as CheckIcon, TrendingUp } from 'lucide-react';

interface MonetizationMatrixProps {
  isPremium: boolean;
  subscriptionTier: string;
  handlePurchase: (priceId: string) => void;
  handleStartTrial: () => void;
  handleInstall: () => void;
  deferredPrompt: any;
  isIOS: boolean;
  isStandalone: boolean;
}

const MonetizationMatrix: React.FC<MonetizationMatrixProps> = ({ 
  isPremium, 
  subscriptionTier,
  handlePurchase, 
  handleStartTrial,
  handleInstall, 
  deferredPrompt,
  isIOS,
  isStandalone
}) => {
  const tiers = [
    {
      name: "Sovereign Monthly",
      price: "$9.99",
      period: "/month",
      id: "price_monthly_999",
      highlight: false,
      tag: "Flexible",
      features: [
        "Real-time PPG Hemodynamics",
        "Neural Baseline Monitoring",
        "Encrypted Local Health Ledger",
        "Sovereign Oracle Q&A"
      ]
    },
    {
      name: "Sovereign Yearly",
      price: "$6.58",
      period: "/month",
      subtext: "billed $79.00 annually",
      id: "price_yearly_7900",
      highlight: true,
      tag: "Most Popular - Save 33%",
      features: [
        "Everything in Monthly",
        "72-Hour Trajectory Projection",
        "Historical Drift Analysis",
        "Priority Heuristic Engine Updates",
        "Clinical Archive Export (PDF/JSON)"
      ]
    },
    {
      name: "Sovereign Lifetime",
      price: "$199",
      period: "once",
      id: "price_lifetime_199",
      highlight: false,
      tag: "Permanent Ownership",
      features: [
        "Everything in Yearly",
        "Single Payment / Zero Revocation",
        "Unlimited Updates Policy",
        "Early Access to Bio-Telemetry v5",
        "Custom Hemodynamic Profile"
      ]
    }
  ];

  return (
    <section style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background Sovereign Vault Effect */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        background: 'radial-gradient(circle at 50% 0%, rgba(110, 216, 195, 0.05) 0%, transparent 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      
      <div className="hs-grid" style={{ gap: '3rem', position: 'relative', zIndex: 1 }}>
      <section className="col-span-12" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 className="technical" style={{ fontSize: '2.5rem', marginBottom: '1rem', letterSpacing: '0.1em' }}>
          ACTIVATE SOVEREIGN STACK
        </h2>
        <p style={{ color: 'var(--hs-text-dim)', maxWidth: '700px', margin: '0 auto', fontSize: '1rem', lineHeight: 1.6 }}>
          HealthShield AI is a local-first biometric node. No cloud analysis, no data leaks. 
          Transition from basic tracking to high-fidelity hemodynamic trajectory projection.
        </p>
      </section>

      {/* Pricing Grid */}
      <div className="col-span-12 hs-grid" style={{ gap: '3.5rem', alignItems: 'stretch', marginTop: '3rem' }}>
        {tiers.map((tier) => (
          <div 
            key={tier.id}
            className={`obsidian-card col-span-12 pc-col-span-4 ${tier.highlight ? 'highlight-border' : ''}`}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              position: 'relative',
              background: tier.highlight ? 'rgba(0, 242, 255, 0.05)' : 'var(--hs-bg-card)',
              transform: tier.highlight ? 'scale(1.02)' : 'scale(1)',
              zIndex: tier.highlight ? 10 : 1,
              border: tier.highlight ? '1px solid var(--hs-primary)' : '1px solid rgba(255,255,255,0.05)',
              overflow: 'visible', /* Fix for clipped tags */
              marginTop: '1.5rem'  /* Space for tags to breathe */
            }}
          >
            {tier.tag && (
              <span 
                className="technical" 
                style={{ 
                  position: 'absolute', 
                  top: '-12px', 
                  right: '24px', 
                  background: tier.highlight ? 'var(--hs-primary)' : 'rgba(110, 216, 195, 0.45)',
                  color: tier.highlight ? '#050505' : '#e0f2f1',
                  padding: '6px 16px',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  borderRadius: '2px',
                  border: tier.highlight ? 'none' : '1px solid rgba(110, 216, 195, 0.6)',
                  boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}
              >
                {tier.tag}
              </span>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 className="technical" style={{ fontSize: '1rem', color: tier.highlight ? 'var(--hs-primary)' : 'white' }}>
                {tier.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '0.5rem' }}>
                <span className="metric-value" style={{ fontSize: '2.8rem', fontWeight: 900 }}>{tier.price}</span>
                <span className="metric-unit" style={{ marginLeft: '6px', fontWeight: 800 }}>{tier.period}</span>
              </div>
              {tier.subtext && (
                <p style={{ fontSize: '0.7rem', color: 'var(--hs-text-dim)', marginTop: '4px' }}>{tier.subtext}</p>
              )}
            </div>

            <div style={{ flex: 1, marginBottom: '2rem' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {tier.features.map((feature, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.8rem', color: '#B0BEC5' }}>
                    <CheckIcon size={14} style={{ color: 'var(--hs-primary)', flexShrink: 0 }} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              disabled={isPremium}
              onClick={() => handlePurchase(tier.id)}
              className={`hs-btn-primary ${tier.highlight ? 'pulse-active' : ''}`}
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                padding: '22px', 
                background: tier.highlight ? 'var(--hs-primary)' : 'rgba(255,255,255,0.08)',
                color: tier.highlight ? '#050505' : 'white',
                border: tier.highlight ? 'none' : '1px solid rgba(255,255,255,0.2)',
                cursor: isPremium ? 'not-allowed' : 'pointer',
                fontWeight: 900,
                fontSize: '0.85rem',
                letterSpacing: '0.05em'
              }}
            >
              {isPremium ? 'STACK ACTIVE' : 'ACTIVATE NODE'}
            </button>

            {tier.highlight && !isPremium && (
              <button 
                onClick={handleStartTrial}
                className="technical"
                style={{ 
                  marginTop: '1rem', 
                  width: '100%', 
                  background: 'transparent', 
                  color: 'var(--hs-primary)', 
                  border: '1px solid rgba(110, 216, 195, 0.3)',
                  padding: '10px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  borderRadius: '2px'
                }}
              >
                START 14-DAY SOVEREIGN TRIAL
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Trust & Comparison Section */}
      <section className="obsidian-card col-span-12" style={{ marginTop: '2rem', background: 'rgba(0,0,0,0.3)' }}>
        <div className="hs-grid">
          <div className="col-span-12 pc-col-span-8">
             <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '1.5rem' }}>
                <TrendingUp size={24} style={{ color: 'var(--hs-primary)' }} />
                <h3 className="technical">WHY SOVEREIGN?</h3>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <p className="technical" style={{ fontSize: '0.7rem', color: 'white', marginBottom: '8px' }}>TRADITIONAL HEALTH APPS</p>
                  <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.75rem', color: 'var(--hs-text-dim)' }}>
                    <li style={{ marginBottom: '10px' }}>• Cloud-dependent data storage</li>
                    <li style={{ marginBottom: '10px' }}>• Shared biometric data (Ads/Research)</li>
                    <li style={{ marginBottom: '10px' }}>• $39.99/yr basic baseline only</li>
                  </ul>
                </div>
                <div>
                  <p className="technical" style={{ fontSize: '0.7rem', color: 'var(--hs-primary)', marginBottom: '8px' }}>HEALTHSHIELD SOVEREIGN</p>
                  <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.75rem', color: '#CFD8DC' }}>
                    <li style={{ marginBottom: '10px' }}>• 100% Local Encrypted Database</li>
                    <li style={{ marginBottom: '10px' }}>• Zero Knowledge Architecture</li>
                    <li style={{ marginBottom: '10px' }}>• Neural Trajectory Engine (Included)</li>
                  </ul>
                </div>
             </div>
          </div>
          
          <div className="col-span-12 pc-col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '2rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Lock size={16} />
                <span className="technical" style={{ fontSize: '0.6rem' }}>AES-256 SOVEREIGN LAYER</span>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={16} />
                <span className="technical" style={{ fontSize: '0.6rem' }}>HIPAA-COMPLIANT ARCHIVE</span>
             </div>
             {deferredPrompt && (
                <button 
                  onClick={handleInstall}
                  className="hs-btn-primary" 
                  style={{ marginTop: 'auto', background: 'white', color: 'black', border: 'none', padding: '12px' }}
                >
                  <Download size={14} />
                  INSTALL OFFLINE NODE
                </button>
             )}
             {isIOS && !isStandalone && (
                <div 
                  className="hs-badge-secure" 
                  style={{ 
                    marginTop: 'auto', 
                    background: 'rgba(110, 216, 195, 0.1)', 
                    color: 'var(--hs-primary)', 
                    padding: '16px',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={14} />
                    <span className="technical" style={{ fontSize: '0.7rem' }}>REGISTER NODE (IOS)</span>
                  </div>
                  <p style={{ fontSize: '0.6rem', opacity: 0.8, lineHeight: 1.4 }}>
                    Tap the <strong>Share</strong> button in Safari, then select <strong>'Add to Home Screen'</strong> to initialize the offline sovereign agent.
                  </p>
                </div>
             )}
          </div>
        </div>
      </section>
    </div>
    </section>
  );
};

// Internal icon for checkmarks (fallback if needed or for custom styling)
const CheckCircleLocal = ({ size, style }: { size: number, style?: React.CSSProperties }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    style={style}
  >
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);

export default MonetizationMatrix;
