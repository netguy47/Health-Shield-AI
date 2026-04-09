import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Activity, 
  Shield, 
  Database, 
  Cpu, 
  Lock, 
  Download, 
  ChevronRight, 
  Zap,
  TrendingUp,
  Heart,
  Plus,
  MessageSquare
} from 'lucide-react';

// Sovereign Components
import OpticalSensor from './components/OpticalSensor';
import MedicalLedger from './components/MedicalLedger';
import OracleHUD from './components/OracleHUD';
import ScoreGauge from './components/ScoreGauge';
import ConsultantHub from './components/ConsultantHub';
import { maskLogData, unmaskLogData } from './lib/encryption';
import { calculateNeuralCardioScore } from './lib/oracle_engine';
import { bufferLogOffline, getBufferedLogs, clearSyncBuffer } from './lib/offline_buffer';
import { requestSovereignNotifications, triggerScheduledReminders } from './lib/notifications';

const App: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'HUB' | 'DATA' | 'ENGINE' | 'SAFE' | 'CONSULTANT' | 'ORACLE'>('HUB');
  const [isPremium, setIsPremium] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showSensor, setShowSensor] = useState(false);

  useEffect(() => {
    // 1. Success verification from URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setIsPremium(true);
      localStorage.setItem('healthshield_sovereign_node', 'active');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const savedNode = localStorage.getItem('healthshield_sovereign_node');
      if (savedNode === 'active') setIsPremium(true);
    }

    // 2. Firebase Sync (Encrypted Stream)
    const q = query(collection(db, 'health_logs'), orderBy('timestamp', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Unmask encrypted data on the fly at the UI level
      const newLogs = snapshot.docs.map(doc => unmaskLogData({ id: doc.id, ...doc.data() }));
      setLogs(newLogs);
    });

    // 3. PWA Install Logic
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    const initSovereign = async () => {
      // a. Notifications Check
      await requestSovereignNotifications();
      triggerScheduledReminders();
      
      // b. Sync Offline Data if online
      if (navigator.onLine) {
        const buffered = await getBufferedLogs();
        if (buffered.length > 0) {
          console.log(`SENTINEL: commencing sync of ${buffered.length} offline logs...`);
          try {
            for (const log of buffered) {
               await addDoc(collection(db, 'health_logs'), { 
                 payload: log.payload, 
                 timestamp: serverTimestamp(),
                 source: 'SOVEREIGN_SYNC'
               });
            }
            await clearSyncBuffer();
          } catch (e) {
            console.error("Sync Error:", e);
          }
        }
      }
    };
    initSovereign();

    return () => unsubscribe();
  }, [db]);

  const handleCapture = async (bpm: number) => {
    try {
      const baseLog = {
        heart_rate: bpm,
        spo2: 98, // Simulated baseline
        timestamp: serverTimestamp(),
        source: 'OPTICAL_SENTINEL'
      };

      // Encrypt before submission
      const encryptedLog = maskLogData(baseLog);
      
      if (navigator.onLine) {
        await addDoc(collection(db, 'health_logs'), encryptedLog);
      } else {
        console.warn("Dead-zone detected. Buffering log to Sovereign IDB.");
        await bufferLogOffline(encryptedLog.payload);
      }
      
      setShowSensor(false);
    } catch (error) {
      console.error('Sovereign Submission Failed:', error);
    }
  };

  const handlePurchase = async () => {
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Checkout initialization failed.');
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Sovereign Hub Error:', error);
      alert('Secure Checkout Failed.');
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  const neuralScore = useMemo(() => calculateNeuralCardioScore(logs), [logs]);

  return (
    <div className="hs-app-container">
      {/* Secure Header */}
      <header className="hs-header">
        <div className="hs-logo-container">
          <Activity className="nav-icon" style={{ color: 'var(--hs-primary)' }} />
          <h1 className="technical" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.1em' }}>HEALTHSHIELD <span style={{ color: 'var(--hs-primary)' }}>AI</span></h1>
        </div>
        <div className="hs-badge-secure">
          <Lock size={12} />
          <span>AES-256 SOVEREIGN</span>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="hs-grid" style={{ marginTop: '1rem' }}>
        
        {activeView === 'HUB' && (
          <>
            {/* Neural Cardio Score Node */}
            <section className="col-span-12 pc-col-span-4">
              <div className="obsidian-card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ScoreGauge score={neuralScore} />
              </div>
            </section>

            {/* Metric 1: Pulse Velocity */}
            <section className="obsidian-card col-span-12 pc-col-span-8">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="technical" style={{ fontSize: '0.7rem', color: '#849495', fontWeight: 600 }}>PULSE VELOCITY</p>
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span className="metric-value">{logs[0]?.heart_rate || '--'}</span>
                    <span className="metric-unit">BPM</span>
                  </div>
                </div>
                <TrendingUp size={20} style={{ color: '#00F2FF', opacity: 0.5 }} />
              </div>
              
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="technical" style={{ fontSize: '0.6rem', color: '#849495' }}>SIGNAL INTEGRITY</span>
                  <span className="technical" style={{ fontSize: '0.6rem', color: '#00F2FF' }}>98.4%</span>
                </div>
                <div className="pulse-container">
                  {[...Array(24)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`pulse-segment ${i < 18 ? 'active' : ''}`} 
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Metric 2: Systolic Baseline */}
            <section className="obsidian-card col-span-12 pc-col-span-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="technical" style={{ fontSize: '0.7rem', color: '#849495', fontWeight: 600 }}>LAST RECORDED BP</p>
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span className="metric-value">{logs[0]?.systolic || '118'}/{logs[0]?.diastolic || '78'}</span>
                    <span className="metric-unit">mmHg</span>
                  </div>
                </div>
                <Activity size={20} style={{ color: '#00F2FF', opacity: 0.5 }} />
              </div>
            </section>

            {/* Metric 3: Heart Integrity */}
            <section className="obsidian-card col-span-12 pc-col-span-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p className="technical" style={{ fontSize: '0.7rem', color: '#849495', fontWeight: 600 }}>HEART INTEGRITY</p>
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span className="metric-value">0.92</span>
                    <span className="metric-unit">SVRN</span>
                  </div>
                </div>
                <Heart size={20} style={{ color: '#00F2FF', opacity: 0.5 }} />
              </div>
            </section>

            {/* Feature Overlay / Premium Gate */}
            {!isPremium && (
              <section className="obsidian-card col-span-12" style={{ marginTop: '1rem', background: 'rgba(0, 242, 255, 0.03)', border: '1px solid rgba(0, 242, 255, 0.1)' }}>
                <div className="hs-grid">
                  <div className="col-span-12 pc-col-span-8">
                    <h2 className="technical" style={{ color: '#00F2FF', marginBottom: '0.5rem' }}>AUTONOMOUS TRAJECTORY PROJECTION</h2>
                    <p style={{ color: '#849495', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                      Unlock the Sovereign Archive to access 72-hour metabolic forecasting and cardiovascular entropy analysis.
                    </p>
                    <button 
                      onClick={handlePurchase}
                      className="hs-badge-secure" 
                      style={{ background: '#00F2FF', color: '#050505', border: 'none', cursor: 'pointer', padding: '12px 20px', borderRadius: '8px' }}
                    >
                      <span>ACTIVATE SOVEREIGN ACCESS</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Simple Stream View */}
            <section className="obsidian-card col-span-12" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                 <h3 className="technical" style={{ fontSize: '1rem' }}>SECURE STREAM</h3>
                 <Zap size={16} className="active" style={{ color: '#00F2FF' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {logs.slice(0, 5).map((log) => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
                    <span className="technical" style={{ fontSize: '0.8rem' }}>{log.heart_rate} BPM</span>
                    <span style={{ fontSize: '0.6rem', color: '#849495' }}>{log.source || 'MANUAL'}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeView === 'DATA' && (
          <div className="col-span-12">
            <MedicalLedger logs={logs} isPremium={isPremium} />
          </div>
        )}

        {activeView === 'ENGINE' && (
          <div className="col-span-12">
            {!showSensor ? (
              <div className="obsidian-card" style={{ padding: '4rem', textAlign: 'center' }}>
                <Cpu size={48} style={{ color: '#00F2FF', opacity: 0.2, marginBottom: '2rem' }} />
                <h2 className="technical" style={{ marginBottom: '1rem' }}>HEMODYNAMIC ENGINE</h2>
                <p style={{ color: '#849495', marginBottom: '2rem' }}>Ready for high-frequency biometric acquisition.</p>
                <button 
                  onClick={() => setShowSensor(true)}
                  className="hs-badge-secure" 
                  style={{ background: '#00F2FF', color: '#050505', border: 'none', padding: '16px 32px', cursor: 'pointer' }}
                >
                  <Plus size={18} />
                  <span>INITIATE OPTICAL SCAN</span>
                </button>
              </div>
            ) : (
              <OpticalSensor onCapture={handleCapture} onClose={() => setShowSensor(false)} />
            )}
          </div>
        )}

        {activeView === 'CONSULTANT' && <ConsultantHub logs={logs} />}

        {activeView === 'ORACLE' && <OracleHUD logs={logs} isPremium={isPremium} />}

        {activeView === 'SAFE' && (
          <div className="col-span-12">
            {!isPremium ? (
              <div className="hs-grid">
                {/* Free Tier */}
                <div className="obsidian-card col-span-12 pc-col-span-6" style={{ height: 'fit-content' }}>
                  <div className="hs-badge-secure" style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', color: '#fff' }}>BASIC ACCESS</div>
                  <h3 className="technical" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>FREE</h3>
                  <ul style={{ color: '#849495', fontSize: '0.8rem', paddingLeft: '1rem', marginBottom: '2rem' }}>
                    <li style={{ marginBottom: '0.5rem' }}>Direct Biometric Capture</li>
                    <li style={{ marginBottom: '0.5rem' }}>Local Data Persistence</li>
                    <li style={{ marginBottom: '0.5rem' }}>Basic Staging Reports</li>
                  </ul>
                  <button className="hs-badge-secure" style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }}>CURRENT PLAN</button>
                </div>

                {/* Sovereign Tier */}
                <div className="obsidian-card col-span-12 pc-col-span-6" style={{ border: '1px solid var(--hs-primary)', background: 'rgba(110, 216, 195, 0.05)' }}>
                  <div className="scan-line"></div>
                  <div className="hs-badge-secure" style={{ marginBottom: '1rem', background: 'var(--hs-primary)', color: '#000' }}>SOVEREIGN ACCESS</div>
                  <h3 className="technical" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>$199 / LIFETIME</h3>
                  <ul style={{ color: 'var(--hs-text)', fontSize: '0.8rem', paddingLeft: '1rem', marginBottom: '2rem' }}>
                    <li style={{ marginBottom: '0.5rem' }}>Autonomous Trajectory Projection (72hr)</li>
                    <li style={{ marginBottom: '0.5rem' }}>Sovereign Consultant Q&A Engine</li>
                    <li style={{ marginBottom: '0.5rem' }}>Cloud-Sync Encrypted Cold Storage</li>
                    <li style={{ marginBottom: '0.5rem' }}>Neural Cardio 0-100 Scoring</li>
                    <li style={{ marginBottom: '0.5rem' }}>Priority Sentinel Heuristics</li>
                  </ul>
                  <button 
                    onClick={handlePurchase}
                    className="hs-badge-secure" 
                    style={{ width: '100%', background: 'var(--hs-primary)', color: '#000', cursor: 'pointer' }}
                  >
                    ACTIVATE SOVEREIGN NODE
                  </button>
                </div>

                {/* PWA Install Section */}
                <div className="obsidian-card col-span-12" style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <Download size={32} style={{ color: 'var(--hs-primary)', marginBottom: '1rem' }} />
                    <h4 className="technical">MOBILE INSTRUMENT MODE</h4>
                    <p style={{ color: '#849495', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                      Install HealthShield AI as a standalone PWA for high-frequency optical sensor access and offline monitoring.
                    </p>
                    <button 
                      onClick={handleInstall}
                      className="hs-badge-secure"
                      style={{ border: '1px solid var(--hs-primary)', color: 'var(--hs-primary)', cursor: 'pointer' }}
                    >
                      {deferredPrompt ? 'INSTALL TO HOME SCREEN' : 'PWA MODE READY (STAY TUNED)'}
                    </button>
                </div>
              </div>
            ) : (
              <OracleHUD logs={logs} isPremium={isPremium} />
            )}
          </div>
        )}

      </main>

      {/* PWA Install Prompt */}
      {deferredPrompt && (
        <div style={{ position: 'fixed', bottom: '100px', left: '1.5rem', right: '1.5rem', zIndex: 1100 }}>
          <div className="obsidian-card" style={{ background: '#00F2FF', color: '#050505', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Download size={20} />
              <span className="technical" style={{ fontWeight: 700, fontSize: '0.8rem' }}>INSTALL SOVEREIGN HUB</span>
            </div>
            <button onClick={handleInstall} style={{ background: '#050505', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>GET APP</button>
          </div>
        </div>
      )}

      {/* Sovereign Dock (Global Navigation) */}
      <nav className="hs-dock-fixed">
        <div className="hs-dock">
          <button onClick={() => setActiveView('HUB')} className={`nav-item ${activeView === 'HUB' ? 'active' : ''}`}>
            <Activity className="nav-icon" />
            <span>HUB</span>
          </button>
          <button onClick={() => setActiveView('DATA')} className={`nav-item ${activeView === 'DATA' ? 'active' : ''}`}>
            <Database className="nav-icon" />
            <span>DATA</span>
          </button>
          <button onClick={() => setActiveView('CONSULTANT')} className={`nav-item ${activeView === 'CONSULTANT' ? 'active' : ''}`}>
            <MessageSquare className="nav-icon" />
            <span>ADVISOR</span>
          </button>
          <button 
            onClick={() => isPremium ? setActiveView('ORACLE') : setActiveView('SAFE')} 
            className={`nav-item ${activeView === 'ORACLE' ? 'active' : ''}`}
          >
            <Cpu className="nav-icon" />
            <span>ORACLE</span>
          </button>
          <button onClick={() => setActiveView('SAFE')} className={`nav-item ${activeView === 'SAFE' ? 'active' : ''}`}>
            <Shield className="nav-icon" />
            <span>SAFE</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
