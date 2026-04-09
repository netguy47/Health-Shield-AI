import React, { useMemo } from 'react';
import { generateSentinelInsight, HealthLog, classifyBP } from '../lib/oracle_engine';
import { Cpu, Zap, Activity, ShieldCheck, Download, AlertTriangle, TrendingUp } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import TrajectoryGraph from './TrajectoryGraph';

interface OracleHUDProps {
  logs: HealthLog[];
  isPremium: boolean;
}

const OracleHUD: React.FC<OracleHUDProps> = ({ logs, isPremium }) => {
  const latestLog = logs[0] || null;
  const insight = useMemo(() => generateSentinelInsight(logs), [logs]);
  const classification = latestLog ? classifyBP(latestLog.systolic || 120, latestLog.diastolic || 80) : 'UNKNOWN';

  const downloadReport = () => {
    const reportData = logs.map(l => ({
      date: new Date(l.timestamp?.toDate()).toLocaleString(),
      bp: `${l.systolic || '--'}/${l.diastolic || '--'}`,
      pulse: l.heart_rate,
      spo2: l.spo2
    }));

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HealthShield_Sovereign_Report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="hs-grid">
      {/* 1. Terminal Insight Node */}
      <section className="obsidian-card col-span-12" style={{ borderLeft: '4px solid #00F2FF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={18} style={{ color: '#00F2FF' }} />
            <h3 className="technical" style={{ fontSize: '0.9rem' }}>SENTINEL ORACLE LOG</h3>
          </div>
          <div className="hs-badge-secure" style={{ fontSize: '0.6rem' }}>
            {classification}
          </div>
        </div>
        <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
          <p style={{ color: '#FFF', fontSize: '0.9rem', lineHeight: 1.6, fontFamily: 'Space Grotesk' }}>
            {insight}
          </p>
        </div>
        <p style={{ fontSize: '0.6rem', color: '#849495', marginTop: '1rem', fontStyle: 'italic' }}>
          Heuristic Analysis Engine v4.0.2 — Zero Cloud Dependency Enabled.
        </p>
      </section>

      {/* 2. Risk Metrics Grid */}
      <section className="obsidian-card col-span-12 pc-col-span-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
          <TrendingUp size={16} style={{ color: 'var(--hs-primary)' }} />
          <span className="technical" style={{ fontSize: '0.7rem' }}>72-HR TRAJECTORY PROJECTION</span>
        </div>
        <TrajectoryGraph logs={logs} />
      </section>

      <section className="obsidian-card col-span-12 pc-col-span-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
          <Activity size={16} style={{ color: 'var(--hs-primary)' }} />
          <span className="technical" style={{ fontSize: '0.7rem' }}>BASELINE DRIFT (CUSUM)</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <span className="metric-value" style={{ fontSize: '2rem' }}>+1.4</span>
            <span className="metric-unit">%</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="technical" style={{ fontSize: '0.6rem', color: '#849495' }}>30-DAY WINDOW</p>
          </div>
        </div>
      </section>

      {/* 3. Global Control Node */}
      <section className="obsidian-card col-span-12" style={{ background: 'rgba(0, 242, 255, 0.02)' }}>
        <Dialog.Root>
          <div className="hs-grid">
            <div className="col-span-12 pc-col-span-8">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                <ShieldCheck size={24} style={{ color: '#00F2FF' }} />
                <Dialog.Title className="technical">SOVEREIGN HEALTH REPORT</Dialog.Title>
              </div>
              <Dialog.Description style={{ color: '#849495', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                Generate a high-fidelity clinical summary of your hemodynamic trajectories. All data is unmasked locally for the report and remains 100% private to your device.
              </Dialog.Description>
              <button 
                onClick={downloadReport}
                className="hs-badge-secure" 
                style={{ background: '#00F2FF', color: '#050505', border: 'none', cursor: 'pointer', padding: '12px 24px', fontWeight: 700 }}
              >
                <Download size={16} />
                <span>GENERATE CLINICAL ARCHIVE</span>
              </button>
            </div>
            
            <div className="col-span-12 pc-col-span-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div style={{ textAlign: 'center', border: '1px dashed rgba(255, 255, 255, 0.1)', padding: '1.5rem', borderRadius: '8px', width: '100%' }}>
                  <AlertTriangle size={20} style={{ color: '#FFB800', marginBottom: '8px' }} />
                  <p className="technical" style={{ fontSize: '0.5rem', color: '#849495', lineHeight: 1.4 }}>
                    GENERAL WELLNESS DISCLAIMER:<br/>
                    Sentinel Oracle provides hemodynamic trend analysis for wellness tracking. This is not a diagnostic device. Consult a physician for clinical decisions.
                  </p>
               </div>
            </div>
          </div>
        </Dialog.Root>
      </section>
    </div>
  );
};

export default OracleHUD;
