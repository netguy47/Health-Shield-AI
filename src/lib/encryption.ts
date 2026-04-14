import CryptoJS from 'crypto-js';

// Generate or retrieve a device-specific Sovereign Key
const getSovereignKey = (): string => {
  let key = localStorage.getItem('sovereign_node_key');
  if (!key) {
    // Generate 256-bit entropy for local device encryption
    key = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    localStorage.setItem('sovereign_node_key', key);
  }
  return key;
};

const MASTER_KEY = getSovereignKey();

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
    throw new Error('Encryption failed. Sovereignty lock enforced.'); // Fail-closed
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
    if (!originalText) throw new Error('Malformed payload');
    return originalText;
  } catch (error) {
    console.warn('[Sovereign Decryption] Decryption failed.');
    return 'ENCRYPTED_OR_CORRUPT'; // Do not return raw ciphertext as valid data
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
