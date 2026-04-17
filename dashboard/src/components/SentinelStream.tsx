import React, { useEffect, useRef } from 'react';
import { Zap, Activity, ShieldCheck, Cpu } from 'lucide-react';

interface SentinelEvent {
  id: string;
  type: 'PULSE' | 'HEURISTIC' | 'SYNC' | 'ALERT';
  value: string;
  timestamp: Date;
  integrity: number;
}

interface SentinelStreamProps {
  logs: any[];
}

const SentinelStream: React.FC<SentinelStreamProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate mock stream events from real logs + synthetic heuristic logs
  const events: SentinelEvent[] = [
    ...logs.slice(0, 5).map(l => ({
      id: `real-${l.id}`,
      type: 'PULSE' as const,
      value: `${l.heart_rate} BPM Captured`,
      timestamp: new Date(),
      integrity: 0.98
    })),
    { id: 'h1', type: 'HEURISTIC' as const, value: 'Neural Cardio Score Recalculated', timestamp: new Date(), integrity: 0.99 },
    { id: 's1', type: 'SYNC' as const, value: 'Sovereign Node v1.2.7.3 Synchronized', timestamp: new Date(), integrity: 1.0 },
    { id: 'a1', type: 'ALERT' as const, value: 'Optimal recovery state detected', timestamp: new Date(), integrity: 0.94 }
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'PULSE': return <Activity size={14} color="var(--hs-primary)" />;
      case 'HEURISTIC': return <Cpu size={14} color="#A78BFA" />;
      case 'SYNC': return <ShieldCheck size={14} color="#34D399" />;
      default: return <Zap size={14} color="#FBBF24" />;
    }
  };

  return (
    <div className="hs-stream-area" style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      background: 'rgba(5, 5, 5, 0.2)',
      position: 'sticky',
      top: 0
    }}>
      <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(110, 216, 195, 0.08)' }}>
        <h3 className="technical" style={{ fontSize: '0.8rem', letterSpacing: '0.2em', color: 'var(--hs-primary)' }}>SENTINEL STREAM</h3>
        <p className="technical" style={{ fontSize: '0.6rem', color: 'var(--hs-text-dim)', marginTop: '4px' }}>LIVE HEURISTIC FEED</p>
      </div>

      <div 
        ref={scrollRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.5rem',
          scrollbarWidth: 'none'
        }}
      >
        {events.map((event) => (
          <div key={event.id} style={{ 
            display: 'flex', 
            gap: '12px', 
            opacity: 0.9, 
            animation: 'fadeIn 0.5s ease-out forwards' 
          }}>
            <div style={{ marginTop: '2px' }}>{getIcon(event.type)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="technical" style={{ fontSize: '0.65rem', color: 'white' }}>{event.type}</span>
                <span className="technical" style={{ fontSize: '0.55rem', color: 'var(--hs-text-dim)' }}>
                  {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--hs-text)', marginTop: '4px', lineHeight: '1.4' }}>
                {event.value}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <div style={{ height: '2px', flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '1px' }}>
                  <div style={{ height: '100%', width: `${event.integrity * 100}%`, background: 'var(--hs-primary)', opacity: 0.5 }}></div>
                </div>
                <span style={{ fontSize: '0.5rem', color: 'var(--hs-primary)', fontWeight: 800 }}>
                  {(event.integrity * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Static Footer */}
      <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(110, 216, 195, 0.05)', background: 'rgba(5, 5, 5, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="technical" style={{ fontSize: '0.55rem', color: 'var(--hs-text-dim)' }}>NODE_0129</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="spin" style={{ 
                width: '4px', 
                height: '4px', 
                border: '1px solid var(--hs-primary)', 
                opacity: 0.3,
                animationDuration: `${i + 1}s` 
              }}></div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default SentinelStream;
