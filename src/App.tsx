import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Activity, 
  Cpu, 
  Download, 
  ChevronRight, 
  Zap,
  TrendingUp,
  Heart,
  Plus
} from 'lucide-react';

import SovereignHeader from './components/SovereignHeader';
import NavigationDock from './components/NavigationDock';
import PWAInstallOverlay from './components/PWAInstallOverlay';
import MonetizationMatrix from './components/MonetizationMatrix';

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

  const handlePurchase = async (plan: string) => {
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
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

  const logsWithFallbacks = useMemo(() => logs.map(l => ({
    ...l,
    heart_rate: l.heart_rate ?? '--',
    systolic: l.systolic ?? '118',
    diastolic: l.diastolic ?? '78',
    source: l.source || 'SECURE_NODE'
  })), [logs]);

  const neuralScore = useMemo(() => calculateNeuralCardioScore(logsWithFallbacks), [logsWithFallbacks]);

  return (
    <div className="hs-app-container">
      <SovereignHeader />

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
                    <span className="metric-value">{logsWithFallbacks[0]?.heart_rate}</span>
                    <span className="metric-unit">BPM</span>
                  </div>
                </div>
                <TrendingUp size={20} style={{ color: 'var(--hs-primary)', opacity: 0.5 }} />
              </div>
              
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="technical" style={{ fontSize: '0.6rem', color: '#849495' }}>SIGNAL INTEGRITY</span>
                  <span className="technical" style={{ fontSize: '0.6rem', color: 'var(--hs-primary)' }}>98.4%</span>
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
                    <span className="metric-value">
                      {logsWithFallbacks[0]?.systolic}/{logsWithFallbacks[0]?.diastolic}
                    </span>
                    <span className="metric-unit">mmHg</span>
                  </div>
                </div>
                <Activity size={20} style={{ color: 'var(--hs-primary)', opacity: 0.5 }} />
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
            {/* Features & Premium Incentives */}
            <section className="col-span-12" style={{ marginTop: '3rem', padding: '2rem 0', borderTop: '1px solid rgba(110, 216, 195, 0.1)' }}>
              <MonetizationMatrix 
                isPremium={isPremium} 
                handlePurchase={handlePurchase} 
                handleInstall={handleInstall}
                deferredPrompt={deferredPrompt}
              />
            </section>

            {/* Simple Stream View */}
            <section className="obsidian-card col-span-12" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                 <h3 className="technical" style={{ fontSize: '1rem' }}>SECURE STREAM</h3>
                 <Zap size={16} className="active" style={{ color: 'var(--hs-primary)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {logsWithFallbacks.slice(0, 5).map((log) => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
                    <span className="technical" style={{ fontSize: '0.8rem' }}>{log.heart_rate} BPM</span>
                    <span style={{ fontSize: '0.6rem', color: '#849495' }}>{log.source}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeView === 'DATA' && (
          <div className="col-span-12">
            <MedicalLedger logs={logsWithFallbacks} isPremium={isPremium} />
          </div>
        )}

        {activeView === 'CONSULTANT' && <ConsultantHub logs={logsWithFallbacks} />}

        {activeView === 'ORACLE' && <OracleHUD logs={logsWithFallbacks} isPremium={isPremium} />}

        {activeView === 'SAFE' && (
          <div className="col-span-12">
            <MonetizationMatrix 
              isPremium={isPremium} 
              handlePurchase={handlePurchase} 
              handleInstall={handleInstall}
              deferredPrompt={deferredPrompt}
            />
          </div>
        )}

      </main>

      <PWAInstallOverlay deferredPrompt={deferredPrompt} handleInstall={handleInstall} />

      {/* Sovereign Dock (Global Navigation) */}
      <NavigationDock activeView={activeView} setActiveView={setActiveView} isPremium={isPremium} />
    </div>
  );
};

export default App;
