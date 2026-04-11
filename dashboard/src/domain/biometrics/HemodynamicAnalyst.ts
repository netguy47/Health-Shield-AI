import { HealthLog } from '../../lib/oracle_engine';

export type BPClassification = 'NORMAL' | 'ELEVATED' | 'STAGE_1' | 'STAGE_2' | 'SEVERE' | 'UNKNOWN';

export interface ClinicalSnapshot {
  classification: BPClassification;
  systolic: number;
  diastolic: number;
  pulse: number;
  drift: number;
  score: number;
  isStable: boolean;
  timestamp: string;
}

/**
 * HemodynamicAnalyst
 * Domain Agent responsible for high-precision mathematical analysis of biometric logs.
 * Follows AHA 2025 guidelines.
 */
export class HemodynamicAnalyst {
  /**
   * Classifies Blood Pressure based on 2025 AHA Guidelines
   */
  static classifyBP(sys: number, dia: number): BPClassification {
    if (sys > 180 || dia > 120) return 'SEVERE';
    if (sys >= 140 || dia >= 90) return 'STAGE_2';
    if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return 'STAGE_1';
    if (sys >= 120 && sys <= 129 && dia < 80) return 'ELEVATED';
    if (sys < 120 && dia < 80) return 'NORMAL';
    return 'UNKNOWN';
  }

  /**
   * Calculates baseline drift as a percentage
   */
  static calculateDrift(history: number[]): number {
    if (history.length < 10) return 0;
    const reversed = [...history].reverse();
    const baseline = reversed.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const current = reversed.slice(-5).reduce((a, b) => a + b, 0) / 5;
    
    return ((current - baseline) / baseline) * 100;
  }

  /**
   * Generates a complete clinical snapshot from logs
   */
  static generateSnapshot(logs: HealthLog[]): ClinicalSnapshot | null {
    if (logs.length === 0) return null;

    const latest = logs[0];
    const sys = latest.systolic || 120;
    const dia = latest.diastolic || 80;
    const classification = this.classifyBP(sys, dia);
    
    const sysHistory = logs.filter(l => l.systolic).map(l => l.systolic!) as number[];
    const drift = this.calculateDrift(sysHistory);

    // Score Calculation (Staging 60% / Stability 40%)
    let stagingScore = 100;
    if (classification === 'ELEVATED') stagingScore = 85;
    else if (classification === 'STAGE_1') stagingScore = 70;
    else if (classification === 'STAGE_2') stagingScore = 40;
    else if (classification === 'SEVERE') stagingScore = 10;

    const stabilityScore = Math.max(0, 100 - (Math.abs(drift) * 5));
    const finalScore = (stagingScore * 0.6) + (stabilityScore * 0.4);

    return {
      classification,
      systolic: sys,
      diastolic: dia,
      pulse: latest.heart_rate,
      drift,
      score: finalScore,
      isStable: Math.abs(drift) <= 5,
      timestamp: new Date().toISOString()
    };
  }
}
