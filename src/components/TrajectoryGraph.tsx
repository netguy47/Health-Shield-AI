import React from 'react';
import { HealthLog } from '../lib/oracle_engine';

interface TrajectoryGraphProps {
  logs: HealthLog[];
}

const TrajectoryGraph: React.FC<TrajectoryGraphProps> = ({ logs }) => {
  const data = logs.slice(0, 10).reverse();
  const width = 300;
  const height = 100;
  
  // Projection Logic: Simple Linear Extrapolation for the "Forecast"
  const getPath = (attr: 'systolic' | 'heart_rate') => {
    if (data.length < 2) return "";
    const points = data.map((d, i) => {
      const x = (i / (data.length + 3)) * width;
      const val = d[attr] || 0;
      const y = height - ((val - 60) / 120) * height; // Normalize 60-180 range
      return `${x},${y}`;
    });

    // Forecast Projection (Last 3 points)
    const lastX = (data.length / (data.length + 3)) * width;
    const lastY = height - (((data[data.length - 1][attr] || 120) - 60) / 120) * height;
    
    return `M ${points.join(' L')} L ${width},${lastY}`;
  };

  return (
    <div className="vault-lock-container" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(110, 216, 195, 0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h4 className="technical" style={{ fontSize: '0.6rem', color: 'var(--hs-primary)' }}>72-HR TRAJECTORY PROJECTION</h4>
        <span className="hs-badge-secure" style={{ fontSize: '0.5rem' }}>BETA PROTOCOL</span>
      </div>
      
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Grid Lines */}
        <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
        
        {/* Systolic Path */}
        <path 
          d={getPath('systolic')} 
          fill="none" 
          stroke="var(--hs-primary)" 
          strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 5px var(--hs-primary)44)' }}
        />
        
        {/* Heart Rate Path */}
        <path 
          d={getPath('heart_rate')} 
          fill="none" 
          stroke="#00b8a9" 
          strokeWidth="1.5"
          strokeDasharray="2 2"
          opacity="0.5"
        />

        {/* Projection Marker */}
        <line x1={width * 0.75} y1="0" x2={width * 0.75} y2={height} stroke="rgba(255,255,255,0.1)" strokeDasharray="2 2" />
        <text x={width * 0.76} y="15" fill="var(--hs-text-dim)" className="technical" style={{ fontSize: '10px' }}>FORECAST</text>
      </svg>

      <div style={{ display: 'flex', gap: '20px', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', background: 'var(--hs-primary)' }}></div>
          <span className="technical" style={{ fontSize: '0.5rem' }}>SYSTOLIC DEPTH</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', background: '#00b8a9', opacity: 0.5 }}></div>
          <span className="technical" style={{ fontSize: '0.5rem' }}>PULSE VELOCITY</span>
        </div>
      </div>
    </div>
  );
};

export default TrajectoryGraph;
