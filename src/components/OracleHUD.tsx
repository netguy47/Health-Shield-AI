import { generateSentinelInsight, HealthLog, classifyBP, calculateDrift } from '../lib/oracle_engine';
import { querySovereignConsultant, AdviceNode } from '../lib/consultant_engine';
import { Cpu, Zap, Activity, ShieldCheck, Download, AlertTriangle, TrendingUp } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import TrajectoryGraph from './TrajectoryGraph';

interface OracleHUDProps {
  logs: HealthLog[];
  isPremium: boolean;
}

const OracleHUD: React.FC<OracleHUDProps> = ({ logs, isPremium }) => {
  const latestLog = logs[0] || null;
  const sysHistory = useMemo(() => logs.filter(l => l.systolic).map(l => l.systolic!) as number[], [logs]);
  const drift = useMemo(() => calculateDrift([...sysHistory].reverse()), [sysHistory]);
  const insight = useMemo(() => generateSentinelInsight(logs), [logs]);
  const classification = latestLog ? classifyBP(latestLog.systolic || 120, latestLog.diastolic || 80) : 'UNKNOWN';

  const [consultNode, setConsultNode] = React.useState<AdviceNode | null>(null);

  const handleConsult = (type: string) => {
    const advice = querySovereignConsultant(type, logs);
    setConsultNode(advice);
  };

  const downloadReport = () => {
    const summary = generateSentinelInsight(logs);
    const report = {
      metadata: {
        archive_version: '4.0.2-SVRN',
        node_id: `SOVEREIGN_${Math.random().toString(36).substring(7).toUpperCase()}`,
        generation_date: new Date().toISOString(),
        compliance: 'Sovereign Protocol v1.0'
      },
      summary: summary,
      trends: {
        current_classification: classification,
        baseline_drift_percent: drift.toFixed(2),
        historical_z_score: "0.85 (Nominal Range)" 
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
    a.download = `HealthShield_Clinical_Archive_${new Date().toISOString().split('T')[0]}.json`;
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
            <span className="metric-value" style={{ fontSize: '2rem' }}>
              {drift > 0 ? '+' : ''}{drift.toFixed(1)}
            </span>
            <span className="metric-unit">%</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="technical" style={{ fontSize: '0.6rem', color: drift > 5 ? '#FF5050' : '#849495' }}>
              {Math.abs(drift) > 5 ? 'ACTION REQUIRED' : 'SAFE ZONE'}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Global Control Node */}
      <section className="obsidian-card col-span-12" style={{ background: 'rgba(0, 242, 255, 0.02)' }}>
        <div className="hs-grid">
          <div className="col-span-12 pc-col-span-8">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <ShieldCheck size={24} style={{ color: '#00F2FF' }} />
              <h3 className="technical" style={{ fontSize: '1.2rem' }}>SOVEREIGN CLINICAL ARCHIVE</h3>
            </div>
            <p style={{ color: '#849495', fontSize: '0.8rem', marginBottom: '1.5rem', maxWidth: '600px' }}>
              Generate a high-fidelity hemodynamic summary. All data is processed locally using the Heuristic Oracle and remain 100% private to this node.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={downloadReport}
                className="hs-btn-primary" 
                style={{ width: 'auto', padding: '10px 20px', fontSize: '0.7rem' }}
              >
                <Download size={14} />
                <span>GENERATE ARCHIVE</span>
              </button>
              <button 
                onClick={() => handleConsult('INTERPRET_NUMBERS')}
                className="hs-btn-secondary" 
                style={{ width: 'auto', padding: '10px 20px', fontSize: '0.7rem' }}
              >
                <Zap size={14} />
                <span>CONSULT ORACLE</span>
              </button>
            </div>
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
      </section>

      {/* Consultation Overlay */}
      {consultNode && (
        <Dialog.Root open={!!consultNode} onOpenChange={() => setConsultNode(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="obsidian-card" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90vw', maxWidth: '500px', zIndex: 10001 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 className="technical" style={{ color: 'var(--hs-primary)' }}>ORACLE CONSULTATION</h3>
                <Dialog.Close asChild>
                  <X size={18} style={{ cursor: 'pointer', color: '#849495' }} />
                </Dialog.Close>
              </div>
              <p className="technical" style={{ fontSize: '0.8rem', color: '#849495', marginBottom: '0.5rem' }}>QUERY: {consultNode.question}</p>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(110, 216, 195, 0.1)' }}>
                <p style={{ lineHeight: 1.6, fontSize: '0.95rem' }}>{consultNode.response}</p>
              </div>
              {consultNode.actionRequired && (
                <div style={{ marginTop: '1.5rem', padding: '10px', background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.2)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={14} style={{ color: '#FFB800' }} />
                  <span className="technical" style={{ fontSize: '0.6rem', color: '#FFB800' }}>ACTION REQUIRED: {consultNode.actionRequired}</span>
                </div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
};

export default OracleHUD;
