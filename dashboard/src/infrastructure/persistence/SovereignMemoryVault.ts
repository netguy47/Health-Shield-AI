import { ClinicalSnapshot } from '../../domain/biometrics/HemodynamicAnalyst';

export interface UserPreferences {
  tone: 'CONCISE' | 'DETAILED' | 'CLINICAL';
  formatting: 'MARKDOWN' | 'PLAINTEXT';
  highPriorityAlerts: boolean;
}

export interface EpisodicMemory {
  id: string;
  snapshot: ClinicalSnapshot;
  aiInterpretation: string;
  timestamp: string;
  userFeedback?: 'POSITIVE' | 'NEGATIVE';
}

/**
 * SovereignMemoryVault
 * Infrastructure component for local-first, zero-cloud storage of agent memories.
 * Uses IndexedDB for privacy and persistence.
 */
export class SovereignMemoryVault {
  private dbName = 'HS_SOVEREIGN_VAULT';
  private version = 2;

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('episodes')) {
          db.createObjectStore('episodes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('biometrics')) {
          db.createObjectStore('biometrics', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSteps(count: number): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('biometrics', 'readwrite');
    const dateKey = new Date().toISOString().split('T')[0];
    tx.objectStore('biometrics').put({ id: `STEPS_${dateKey}`, count, timestamp: new Date().toISOString() });
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }

  async getSteps(): Promise<number> {
    const db = await this.getDB();
    const tx = db.transaction('biometrics', 'readonly');
    const dateKey = new Date().toISOString().split('T')[0];
    const request = tx.objectStore('biometrics').get(`STEPS_${dateKey}`);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result ? request.result.count : 0);
    });
  }

  async saveEpisode(episode: EpisodicMemory): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('episodes', 'readwrite');
    tx.objectStore('episodes').put(episode);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }

  async getRecentEpisodes(limit = 5): Promise<EpisodicMemory[]> {
    const db = await this.getDB();
    const tx = db.transaction('episodes', 'readonly');
    const store = tx.objectStore('episodes');
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const sorted = (request.result as EpisodicMemory[])
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(sorted.slice(0, limit));
      };
    });
  }

  async savePreferences(prefs: UserPreferences): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('preferences', 'readwrite');
    tx.objectStore('preferences').put({ id: 'GLOBAL_PREFS', ...prefs });
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }

  async getPreferences(): Promise<UserPreferences> {
    const db = await this.getDB();
    const tx = db.transaction('preferences', 'readonly');
    const request = tx.objectStore('preferences').get('GLOBAL_PREFS');
    
    return new Promise((resolve) => {
      const defaultPrefs: UserPreferences = {
        tone: 'CLINICAL',
        formatting: 'MARKDOWN',
        highPriorityAlerts: true
      };
      request.onsuccess = () => resolve(request.result || defaultPrefs);
    });
  }
}
