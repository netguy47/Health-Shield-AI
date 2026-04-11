import React from 'react';
import { HealthLog, classifyBP, calculateDrift } from '../../lib/oracle_engine';
import { ShieldCheck, Download, AlertTriangle } from 'lucide-react';
import OracleTerminal from './OracleTerminal';
import OracleMetrics from './OracleMetrics';

interface OracleHUDProps {
  logs: HealthLog[];
  isPremium: boolean;
}

/**
 * OracleHUD
 * Main container for the Sovereign Intelligence Presentation Layer.
 * Coordinates the Terminal, Metrics, and Clinical Archive functions.
 */
const OracleHUD: React.FC<OracleHUDProps> = ({ logs }) => {
  const latestLog = logs[0] || null;
  const sysHistory = logs.filter(l => l.systolic).map(l => l.systolic!) as number[];
  const drift = calculateDrift([...sysHistory].reverse());
  const classification = latestLog ? classifyBP(latestLog.systolic || 120, latestLog.diastolic || 80) : 'UNKNOWN';

  const downloadReport = () => {
    const report = {
      metadata: {
        archive_version: '1.4.0-SVRN',
        node_id: `SOVEREIGN_${Math.random().toString(36).substring(7).toUpperCase()}`,
        generation_date: new Date().toISOString(),
        compliance: 'Sovereign Protocol v1.5'
      },
      trends: {
        current_classification: classification,
        baseline_drift_percent: drift.toFixed(2),
      },
      raw_logs: logs.map(l => ({
        timestamp: l.timestamp?.toDate ? l.timestamp.toDate() : 'REALTIME',
        pulse: l.heart_rate,
        bp: `${l.systolic || '--'}/${l.diastolic || '--'}`,
        spo2: l.spo2
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HealthShield_Sovereign_Archive_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="hs-grid">
      {/* 1. Intelligence Terminal Sector */}
      <div className="col-span-12 pc-col-span-8">
        <OracleTerminal logs={logs} />
      </div>

      {/* 2. Quick Clinical Context Sector */}
      <div className="col-span-12 pc-col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <section className="obsidian-card" style={{ flex: 1, borderLeft: '3px solid var(--hs-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <ShieldCheck size={16} style={{ color: 'var(--hs-primary)' }} />
            <span className="technical" style={{ fontSize: '0.7rem' }}>CLINICAL SNAPSHOT</span>
          </div>
          <div>
            <p className="technical" style={{ fontSize: '0.6rem', color: '#849495' }}>CURRENT STAGE</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: '#FFF' }}>{classification}</p>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
             <button 
                onClick={downloadReport}
                className="hs-btn-secondary" 
                style={{ width: '100%', padding: '10px', fontSize: '0.65rem' }}
              >
                <Download size={14} />
                <span>GENERATE ARCHIVE</span>
              </button>
          </div>
        </section>

        <section className="obsidian-card" style={{ flex: 1, background: 'rgba(255,184,0,0.02)' }}>
            <AlertTriangle size={16} style={{ color: '#FFB800', marginBottom: '8px' }} />
            <p className="technical" style={{ fontSize: '0.5rem', color: '#849495', lineHeight: 1.4 }}>
              DISCLAIMER: AI synthesis is for wellness tracking only. Not a diagnostic tool. Consult a physician for clinical decisions.
            </p>
        </section>
      </div>

      {/* 3. Metrics Deep-Dive Sector */}
      <div className="col-span-12">
        <OracleMetrics logs={logs} />
      </div>
    </div>
  );
};

export default OracleHUD;
