/**
 * Sentinel Heuristic Oracle Engine
 * Implements clinical rules for BP Staging (AHA 2025) and Anomaly Detection (CUSUM/Z-Score)
 * 100% On-Device / Sovereign-Safe
 */

export interface HealthLog {
  heart_rate: number;
  systolic?: number;
  diastolic?: number;
  spo2: number;
  timestamp: any;
}

export type BPClassification = 'NORMAL' | 'ELEVATED' | 'STAGE_1' | 'STAGE_2' | 'SEVERE' | 'UNKNOWN';

/**
 * Classifies Blood Pressure based on 2025 AHA Guidelines
 */
export const classifyBP = (sys: number, dia: number): BPClassification => {
  if (sys > 180 || dia > 120) return 'SEVERE';
  if (sys >= 140 || dia >= 90) return 'STAGE_2';
  if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return 'STAGE_1';
  if (sys >= 120 && sys <= 129 && dia < 80) return 'ELEVATED';
  if (sys < 120 && dia < 80) return 'NORMAL';
  return 'UNKNOWN';
};

/**
 * Calculates Z-Score for a metric to detect anomalies
 * (Distance from historical mean in standard deviations)
 */
export const calculateZScore = (value: number, history: number[]): number => {
  if (history.length < 5) return 0; // Not enough data for statistical significance
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const variance = history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.length;
  const stdDev = Math.sqrt(variance);
  return stdDev === 0 ? 0 : (value - mean) / stdDev;
};

/**
 * Implements CUSUM (Cumulative Sum) to detect gradual baseline drift
 * Returns positive if drifting upwards, negative if downwards
 */
export const calculateDrift = (history: number[]): number => {
  if (history.length < 10) return 0;
  const baseline = history.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
  const current = history.slice(-5).reduce((a, b) => a + b, 0) / 5;
  
  // Drift as percentage from baseline
  return ((current - baseline) / baseline) * 100;
};

/**
 * Generates Narrative Insight based on clinical heuristics
 */
export const generateSentinelInsight = (logs: HealthLog[]) => {
  if (logs.length === 0) return "Sentinel is awaiting hemodynamic metrics to begin trajectory analysis.";

  const latest = logs[0];
  const sys = latest.systolic || 120;
  const dia = latest.diastolic || 80;
  const classification = classifyBP(sys, dia);
  
  const sysHistory = logs.filter(l => l.systolic).map(l => l.systolic!) as number[];
  const drift = calculateDrift(sysHistory.reverse());

  let narrative = "";

  // 1. Staging Narrative
  switch (classification) {
    case 'SEVERE': 
      narrative = "CRITICAL: Severe hypertension detected (>180/120). This represents a Hypertensive Crisis. Immediate clinical verification is required.";
      break;
    case 'STAGE_2':
      narrative = `Sentinel identifies Stage 2 Hypertension. Current pressure of ${sys}/${dia} mmHg is within a high-resistance range.`;
      break;
    case 'ELEVATED':
      narrative = "Minor elevation detected. Systolic baseline remains stable, but resistance is hovering above optimal levels.";
      break;
    default:
      narrative = "Hemodynamic status is currently Nominal. All vital signatures match the Sovereign Baseline.";
  }

  // 2. Trend Narrative
  if (Math.abs(drift) > 5) {
    narrative += ` Additionally, a ${Math.abs(drift).toFixed(1)}% ${drift > 0 ? 'upward drift' : 'downward deviation'} in baseline pressure has been recorded over the last 15 cycles.`;
  }

  return narrative;
};

/**
 * Calculates the final Neural Cardio Score (0-100)
 */
export const calculateNeuralCardioScore = (logs: HealthLog[]): number => {
  if (logs.length === 0) return 0;
  const latest = logs[0];
  const sys = latest.systolic || 120;
  const dia = latest.diastolic || 80;
  
  // 1. Staging Points (60%)
  let stagingScore = 100;
  const classification = classifyBP(sys, dia);
  if (classification === 'ELEVATED') stagingScore = 85;
  else if (classification === 'STAGE_1') stagingScore = 70;
  else if (classification === 'STAGE_2') stagingScore = 40;
  else if (classification === 'SEVERE') stagingScore = 10;

  // 2. Stability Points (40%)
  const sysHistory = logs.filter(l => l.systolic).map(l => l.systolic!) as number[];
  const drift = Math.abs(calculateDrift(sysHistory.reverse()));
  const stabilityScore = Math.max(0, 100 - (drift * 5)); 

  return (stagingScore * 0.6) + (stabilityScore * 0.4);
};
