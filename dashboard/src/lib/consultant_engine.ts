import { HealthLog, classifyBP } from './oracle_engine';

export type AdviceNode = {
  id: string;
  question: string;
  response: string;
  actionRequired?: 'REST' | 'HYDRATE' | 'MD_CONSULT' | 'LOG_AGAIN';
};

/**
 * The Sovereign Consultant Utility Tree.
 * Maps physiological states and user queries to deterministic medical insights.
 */
export const querySovereignConsultant = (queryType: string, logs: HealthLog[]): AdviceNode => {
  if (logs.length === 0) {
    return {
      id: 'no_data',
      question: 'Status Check',
      response: 'Insufficient biometric data in the Sovereign Archive. Initialize a scan to begin heuristic analysis.'
    };
  }

  const latest = logs[0];
  const sys = latest.systolic || 0;
  const dia = latest.diastolic || 0;
  const classification = classifyBP(sys, dia);

  // TREE LOGIC MAP
  switch (queryType) {
    case 'INTERPRET_NUMBERS':
      if (classification === 'SEVERE') {
        return {
          id: 'crisis',
          question: 'Critical Alert',
          response: 'Vitals exceed high-risk thresholds (>180/120). Sit quietly for 5 minutes and re-scan. If persistent, seek urgent medical evaluation as per AHA guidelines.',
          actionRequired: 'MD_CONSULT'
        };
      }
      return {
        id: 'nominal_eval',
        question: 'Current Calibration',
        response: `Your vitals are staged as ${classification.replace('_', ' ')}. Your systolic baseline is within safe bounds. Keep logging to maintain the Sentinel baseline.`
      };

    case 'WHAT_ARE_TRENDS':
      const history = logs.slice(0, 10).map(l => l.systolic || 120);
      const isRising = history[0] > history[history.length - 1];
      return {
        id: 'trend_eval',
        question: 'Long-term Trajectory',
        response: isRising 
          ? "The Sentinel detects a subtle upward trend in systolic depth over the last 10 logs. Monitor sodium intake and rest patterns." 
          : "Your baseline is currently stable. The 72-hour trajectory shows high convergence with the clinical nominal zone.",
        actionRequired: isRising ? 'REST' : undefined
      };

    case 'MORNING_NUMBERS':
      return {
        id: 'morning_surge',
        question: 'Circadian Shield',
        response: "Blood pressure naturally spikes in the morning (Circadian Surge). For the most accurate 'Sovereign Baseline', log after 30 minutes of wakefulness but before caffeine intake.",
        actionRequired: 'LOG_AGAIN'
      };

    default:
      return {
        id: 'general',
        question: 'General Advisory',
        response: 'All biometric systems nominal. Proceed with current wellness protocol.'
      };
  }
};
