import { HemodynamicAnalyst, ClinicalSnapshot } from '../../domain/biometrics/HemodynamicAnalyst';
import { SafetySentinel, TriageResult } from './SafetySentinel';
import { SovereignMemoryVault, EpisodicMemory } from '../../infrastructure/persistence/SovereignMemoryVault';
import { WebLLMAdapter } from '../../infrastructure/adapters/WebLLMAdapter';
import { HealthLog } from '../../lib/oracle_engine';

export interface AgentResponse {
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isEmergency: boolean;
  snapshot?: ClinicalSnapshot;
  suggestions?: string[];
}

/**
 * SovereignIntelligenceOrchestrator
 * The Application-layer orchestrator for the multi-agent mesh.
 * Coordinates data flow, safety checks, and local AI synthesis.
 */
export class SovereignIntelligenceOrchestrator {
  private memory = new SovereignMemoryVault();
  private adapter = WebLLMAdapter.getInstance();

  /**
   * Processes a user question or biometric event
   */
  async processIntent(logs: HealthLog[], userQuery?: string): Promise<AgentResponse> {
    // 1. DOMAIN: Generate Clinical Snapshot (The "Analyst")
    const snapshot = HemodynamicAnalyst.generateSnapshot(logs);

    // 2. SAFETY: Run Emergency Triage (The "Sentinel")
    const triage = SafetySentinel.triage(snapshot, userQuery);
    if (triage.isEmergency) {
      return {
        content: triage.recommendedAction || "Emergency detected. Please contact 911.",
        priority: 'CRITICAL',
        isEmergency: true,
        snapshot: snapshot || undefined
      };
    }

    // 3. PERSISTENCE: Retrieve Context (The "Chronicler")
    const history = await this.memory.getRecentEpisodes(3);
    const prefs = await this.memory.getPreferences();

    // 4. SYNTHESIS: Generate AI Insight (The "Oracle")
    const systemPrompt = `
      You are HealthShield AI, a sovereign medical intelligence agent.
      IDENTITY: Concisely interpret health metrics without providing diagnoses.
      USER TONE: ${prefs.tone}. 
      RELEVANT HISTORY: ${JSON.stringify(history)}
      SAFETY: Avoid clinical absolute claims.
      
      If interpreting metrics, acknowledge standard ranges but emphasize clinical verification.
    `;

    const userPrompt = `
      CURRENT METRICS: ${JSON.stringify(snapshot)}
      USER QUERY: ${userQuery || "Analyze my current vitals for trends."}
      
      Provide a trajectory analysis and actionable wellness suggestions.
    `;

    try {
      const insight = await this.adapter.generateResponse(systemPrompt, userPrompt);
      
      // 5. MEMORY: Save this moment to the episodic vault
      if (snapshot) {
        await this.memory.saveEpisode({
          id: `EP_${Date.now()}`,
          snapshot,
          aiInterpretation: insight,
          timestamp: new Date().toISOString()
        });
      }

      return {
        content: insight,
        priority: triage.priority,
        isEmergency: false,
        snapshot: snapshot || undefined,
        suggestions: this.getSuggestionsFromPriority(triage.priority)
      };
    } catch (error) {
      // Fallback for when WebLLM is loading or unavailable
      const deterministicInsight = this.generateDeterministicInsight(snapshot, triage);
      return {
        content: deterministicInsight,
        priority: triage.priority,
        isEmergency: false,
        snapshot: snapshot || undefined
      };
    }
  }

  private getSuggestionsFromPriority(priority: string): string[] {
    if (priority === 'HIGH') return ['Consult with a Physician', 'Perform a Rest Scan', 'Check Manual BP'];
    if (priority === 'MEDIUM') return ['Track Sodium Intake', 'Daily Movement Goal', 'Log Sleep Quality'];
    return ['Maintain Current Baseline', 'Deep Breathing Exercise', 'Next Scheduled Scan'];
  }

  private generateDeterministicInsight(snapshot: ClinicalSnapshot | null, triage: TriageResult): string {
    if (!snapshot) return "Sovereign intelligence ready. Please perform a biometric scan.";
    
    return `Hemodynamic baseline established at ${snapshot.systolic}/${snapshot.diastolic} mmHg. 
      Cardio Score: ${snapshot.score.toFixed(0)}/100. 
      Stability Status: ${snapshot.isStable ? 'Optimal' : 'Deviation detected'}. 
      [Note: AI synthesis currently initializing...]`;
  }
}
