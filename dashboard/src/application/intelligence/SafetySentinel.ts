import { ClinicalSnapshot } from '../../domain/biometrics/HemodynamicAnalyst';

export interface TriageResult {
  isEmergency: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason?: string;
  recommendedAction?: string;
}

/**
 * SafetySentinel
 * Application logic for high-priority safety gating.
 * Ensures no clinical analysis proceeds without a basic emergency check.
 */
export class SafetySentinel {
  private static EMERGENCY_KEYWORDS = [
    'chest pain', 'shortness of breath', 'stroke', 'heart attack', 
    'fainting', 'dizziness', 'severe headache', 'vision loss'
  ];

  /**
   * Triage biometric snapshot and user input for immediate danger
   */
  static triage(snapshot: ClinicalSnapshot | null, userQuery?: string): TriageResult {
    // 1. Biometric Crisis Check (AHA 2025: >180/120 is Crisis)
    if (snapshot) {
      if (snapshot.systolic > 180 || snapshot.diastolic > 120) {
        return {
          isEmergency: true,
          priority: 'CRITICAL',
          reason: 'Hypertensive Crisis detected (>180/120 mmHg).',
          recommendedAction: '⚠️ Call 911 or visit the nearest ER immediately. Do not wait for further analysis.'
        };
      }
      
      if (snapshot.systolic >= 160 || snapshot.diastolic >= 100) {
        return {
          isEmergency: false,
          priority: 'HIGH',
          reason: 'Severe Hypertension Trend (Stage 2 High).',
          recommendedAction: 'Clinical verification recommended today.'
        };
      }
    }

    // 2. Keyword/Semantic Emergency Check
    if (userQuery) {
      const query = userQuery.toLowerCase();
      const match = this.EMERGENCY_KEYWORDS.find(k => query.includes(k));
      if (match) {
        return {
          isEmergency: true,
          priority: 'CRITICAL',
          reason: `Potentially urgent symptom detected: "${match}".`,
          recommendedAction: '⚠️ Symptom indicates urgent medical attention. Contact emergency services or a physician immediately.'
        };
      }
    }

    return {
      isEmergency: false,
      priority: snapshot ? (snapshot.score < 50 ? 'MEDIUM' : 'LOW') : 'LOW'
    };
  }
}
