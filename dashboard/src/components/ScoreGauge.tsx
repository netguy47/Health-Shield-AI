import React from 'react';

interface ScoreGaugeProps {
  score: number;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getStatusColor = () => {
    if (score > 85) return '#6ed8c3'; // Optimal
    if (score > 60) return '#00b8a9'; // Nominal
    return '#ff8800'; // Critical
  };

  return (
    <div className="vault-lock-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
      <svg width="150" height="150" viewBox="0 0 150 150">
        {/* Background Track */}
        <circle 
          cx="75" cy="75" r={radius} 
          fill="transparent" 
          stroke="rgba(110, 216, 195, 0.05)" 
          strokeWidth="8"
        />
        {/* Active Score Track */}
        <circle 
          cx="75" cy="75" r={radius} 
          fill="transparent" 
          stroke={getStatusColor()} 
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)', filter: `drop-shadow(0 0 10px ${getStatusColor()}44)` }}
          transform="rotate(-90 75 75)"
        />
        {/* Center Text */}
        <text x="75" y="70" textAnchor="middle" fill="#FFF" className="technical" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {Math.round(score)}
        </text>
        <text x="75" y="90" textAnchor="middle" fill="var(--hs-text-dim)" className="technical" style={{ fontSize: '0.5rem', letterSpacing: '0.1em' }}>
          NEURAL SCORE
        </text>
      </svg>
      {/* Bio-Signal Indicators */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ width: '40px', height: '2px', background: i <= (score/33) ? getStatusColor() : 'rgba(255,255,255,0.05)' }}></div>
        ))}
      </div>
    </div>
  );
};

export default ScoreGauge;
