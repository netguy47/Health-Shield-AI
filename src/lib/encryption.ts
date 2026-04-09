import CryptoJS from 'crypto-js';

const MASTER_KEY = import.meta.env.VITE_SOVEREIGN_SECRET || 'SOVEREIGN_DEFAULT_0X1';

/**
 * Encrypts a string using AES-256
 * @param data - The plaintext data to encrypt
 * @returns The encrypted ciphertext
 */
export const encryptSovereignData = (data: string): string => {
  try {
    return CryptoJS.AES.encrypt(data, MASTER_KEY).toString();
  } catch (error) {
    console.error('[Sovereign Encryption] Critical Failure:', error);
    return data; // Fallback to plaintext in emergency (Fail-open for medical logs)
  }
};

/**
 * Decrypts a string using AES-256
 * @param ciphertext - The encrypted data
 * @returns The decrypted plaintext
 */
export const decryptSovereignData = (ciphertext: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, MASTER_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText || ciphertext;
  } catch (error) {
    console.warn('[Sovereign Decryption] Decryption failed, treating as plaintext or corrupted.');
    return ciphertext;
  }
};

/**
 * Transparently masks/unmasks object fields for Sovereign logs
 */
export const maskLogData = (log: any) => {
  return {
    ...log,
    heart_rate: encryptSovereignData(String(log.heart_rate)),
    spo2: encryptSovereignData(String(log.spo2)),
    systolic: log.systolic ? encryptSovereignData(String(log.systolic)) : null,
    diastolic: log.diastolic ? encryptSovereignData(String(log.diastolic)) : null,
    sovereign_masked: true
  };
};

export const unmaskLogData = (log: any) => {
  if (!log.sovereign_masked) return log;
  return {
    ...log,
    heart_rate: Number(decryptSovereignData(log.heart_rate)),
    spo2: Number(decryptSovereignData(log.spo2)),
    systolic: log.systolic ? Number(decryptSovereignData(log.systolic)) : null,
    diastolic: log.diastolic ? Number(decryptSovereignData(log.diastolic)) : null,
    sovereign_masked: false
  };
};
