import React, { useState } from 'react';
import { HealthLog } from '../lib/oracle_engine';
import { querySovereignConsultant, AdviceNode } from '../lib/consultant_engine';
import { MessageSquare, ArrowRight, HelpCircle, Activity, Sun, ShieldAlert } from 'lucide-react';

interface ConsultantHubProps {
  logs: HealthLog[];
}

const ConsultantHub: React.FC<ConsultantHubProps> = ({ logs }) => {
  const [activeAdvice, setActiveAdvice] = useState<AdviceNode | null>(null);

  const options = [
    { id: 'INTERPRET_NUMBERS', label: 'Interpret my current vitals', icon: Activity },
    { id: 'WHAT_ARE_TRENDS', label: 'Analyze long-term trends', icon: ShieldAlert },
    { id: 'MORNING_NUMBERS', label: 'Why are my numbers high in the morning?', icon: Sun },
  ];

  const handleQuery = (type: string) => {
    const node = querySovereignConsultant(type, logs);
    setActiveAdvice(node);
  };

  return (
    <div className="hs-grid">
      <section className="obsidian-card col-span-12 pc-col-span-12">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
          <MessageSquare className="nav-icon" style={{ color: 'var(--hs-primary)' }} />
          <div>
            <h3 className="technical" style={{ fontSize: '1.2rem' }}>SOVEREIGN CONSULTANT</h3>
            <p className="technical" style={{ fontSize: '0.6rem', color: 'var(--hs-text-dim)' }}>DETERMINISTIC HEURISTIC Q&A ENGINE</p>
          </div>
        </div>

        {!activeAdvice ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleQuery(opt.id)}
                className="obsidian-card"
                style={{ textAlign: 'left', width: '100%', cursor: 'pointer', border: '1px solid rgba(110, 216, 195, 0.1)' }}
              >
                <opt.icon size={20} style={{ color: 'var(--hs-primary)', marginBottom: '1rem' }} />
                <p className="technical" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{opt.label}</p>
                <ArrowRight size={14} style={{ marginTop: '0.5rem', opacity: 0.5 }} />
              </button>
            ))}
          </div>
        ) : (
          <div className="vault-lock-container" style={{ animation: 'slideIn 0.5s ease' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
              <HelpCircle size={24} style={{ color: 'var(--hs-primary)' }} />
              <div>
                <h4 className="technical" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{activeAdvice.question}</h4>
                <p style={{ color: 'var(--hs-text)', fontSize: '0.9rem', lineHeight: 1.6 }}>{activeAdvice.response}</p>
              </div>
            </div>
            
            {activeAdvice.actionRequired && (
              <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255, 136, 0, 0.1)', border: '1px solid rgba(255, 136, 0, 0.3)', borderRadius: '4px' }}>
                <p className="technical" style={{ fontSize: '0.7rem', color: '#ff8800' }}>RECOMMENDED ACTION: {activeAdvice.actionRequired}</p>
              </div>
            )}

            <button 
              onClick={() => setActiveAdvice(null)}
              className="hs-badge-secure" 
              style={{ marginTop: '2rem', cursor: 'pointer' }}
            >
              RETURN TO CATEGORIES
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default ConsultantHub;
