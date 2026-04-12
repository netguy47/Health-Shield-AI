import React, { useState, useEffect, useRef } from 'react';
import { Footprints, Zap, ShieldCheck, AlertCircle } from 'lucide-react';
import { MotionSensorAdapter } from '../../infrastructure/adapters/MotionSensorAdapter';
import { SovereignMemoryVault } from '../../infrastructure/persistence/SovereignMemoryVault';

/**
 * StepIndicator
 * Presentation component for sovereign step tracking.
 */
const StepIndicator: React.FC = () => {
  const [steps, setSteps] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [permissionState, setPermissionState] = useState<'IDLE' | 'GRANTED' | 'DENIED'>('IDLE');
  const goal = 10000;
  
  const adapter = useRef<MotionSensorAdapter | null>(null);
  const memory = useRef(new SovereignMemoryVault());

  // Load steps on mount
  useEffect(() => {
    const loadSteps = async () => {
      const persistedSteps = await memory.current.getSteps();
      setSteps(persistedSteps);
      adapter.current = new MotionSensorAdapter(persistedSteps);
    };
    loadSteps();

    return () => {
      if (adapter.current) adapter.current.stop();
    };
  }, []);

  const toggleTracking = async () => {
    if (!adapter.current) return;

    if (isActive) {
      adapter.current.stop();
      setIsActive(false);
    } else {
      const granted = await adapter.current.requestPermission();
      if (granted) {
        setPermissionState('GRANTED');
        adapter.current.start((total) => {
          setSteps(total);
          // Sync to storage periodically
          memory.current.saveSteps(total);
        });
        setIsActive(true);
      } else {
        setPermissionState('DENIED');
      }
    }
  };

  const progress = Math.min((steps / goal) * 100, 100);
  const circumference = 2 * Math.PI * 45; // r=45
  const offset = circumference - (progress / 100) * circumference;

  return (
    <section className="obsidian-card col-span-12 pc-col-span-12" style={{ padding: '2rem' }}>
      <div className="hs-grid">
        {/* Left Side: Progress Ring */}
        <div className="col-span-12 pc-col-span-4" style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <svg width="140" height="140" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="6" />
            <circle 
              cx="50" cy="50" r="45" fill="none" 
              stroke="var(--hs-primary)" 
              strokeWidth="6" 
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
            />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <Footprints size={24} style={{ color: 'var(--hs-primary)', marginBottom: '4px' }} />
            <p className="metric-value" style={{ fontSize: '1.2rem', marginBottom: 0 }}>{steps.toLocaleString()}</p>
            <p className="technical" style={{ fontSize: '0.5rem', color: '#849495' }}>STEPS</p>
          </div>
        </div>

        {/* Right Side: Status and Controls */}
        <div className="col-span-12 pc-col-span-8" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <Zap size={16} style={{ color: isActive ? 'var(--hs-primary)' : '#849495' }} />
            <h3 className="technical" style={{ fontSize: '0.8rem' }}>KINETIC SOVEREIGN HUB</h3>
          </div>
          
          <p style={{ color: '#849495', fontSize: '0.8rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {permissionState === 'DENIED' 
              ? '❌ Motion sensor access denied. Please enable motion tracking in your browser settings to use the step counter.'
              : 'On-device motion tracking active. All movement data is processed locally in the Kinetic Domain Agent.'}
          </p>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button 
              onClick={toggleTracking}
              className={isActive ? 'hs-btn-secondary' : 'hs-btn-primary'}
              style={{ width: 'auto', padding: '12px 24px', fontSize: '0.7rem' }}
            >
              {isActive ? 'SUSPEND TRACKING' : 'ACTIVATE KINETIC SENSORS'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} style={{ color: '#00F2FF' }} />
              <span className="technical" style={{ fontSize: '0.6rem', color: '#849495' }}>SECURE OFFLINE ANALYSIS</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StepIndicator;
