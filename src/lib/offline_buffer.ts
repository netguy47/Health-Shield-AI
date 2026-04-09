/**
 * Sovereign Offline Buffer
 * Persists encrypted logs locally when the clinical sentinel is in a dead-zone.
 */

const DB_NAME = 'HealthShieldSovereignDB';
const STORE_NAME = 'OfflineLogs';
const DB_VERSION = 1;

/**
 * Initializes the Sovereign Database
 */
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Saves an encrypted log to the local buffer
 */
export const bufferLogOffline = async (encryptedData: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  await store.add({
    payload: encryptedData,
    timestamp: new Date().toISOString(),
    synced: false
  });
};

/**
 * Retrieves all un-synced logs from the local buffer
 */
export const getBufferedLogs = async (): Promise<any[]> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Clears synced logs from the buffer
 */
export const clearSyncBuffer = async (): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.clear();
};
