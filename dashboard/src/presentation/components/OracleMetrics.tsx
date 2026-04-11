import React from 'react';
import { TrendingUp, Activity } from 'lucide-react';
import TrajectoryGraph from '../../components/TrajectoryGraph';
import { HealthLog, calculateDrift } from '../../lib/oracle_engine';

interface OracleMetricsProps {
  logs: HealthLog[];
}

/**
 * OracleMetrics
 * Presentation component for visualizing hemodynamic trends and stability.
 */
const OracleMetrics: React.FC<OracleMetricsProps> = ({ logs }) => {
  const sysHistory = logs.filter(l => l.systolic).map(l => l.systolic!) as number[];
  const drift = calculateDrift([...sysHistory].reverse());

  return (
    <div className="hs-grid">
      {/* 72-HR Trajectory */}
      <section className="obsidian-card col-span-12 pc-col-span-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
          <TrendingUp size={16} style={{ color: 'var(--hs-primary)' }} />
          <span className="technical" style={{ fontSize: '0.7rem' }}>72-HR TRAJECTORY PROJECTION</span>
        </div>
        <TrajectoryGraph logs={logs} />
      </section>

      {/* Baseline Drift */}
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
            <p className="technical" style={{ fontSize: '0.6rem', color: Math.abs(drift) > 5 ? '#FF5050' : '#849495' }}>
              {Math.abs(drift) > 5 ? 'ACTION REQUIRED' : 'SAFE ZONE'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OracleMetrics;
