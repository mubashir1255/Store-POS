import nacl from 'tweetnacl';
import tweetnaclUtil from 'tweetnacl-util';
const { decodeBase64, encodeUTF8 } = tweetnaclUtil;

// Your embedded public key
const EMBEDDED_PUBLIC_KEY = decodeBase64('qFhk/dzAzBeN4dFFCqtwpbQIGnhBBW4cH+nkrJ8rIac=');

export interface LicensePayload {
  machineId: string;
  storeName: string;
  validUntil: string;
  issuedAt: string;
}

export interface ValidationResult {
  isValid: boolean;
  isExpired: boolean;
  daysRemaining: number;
  expiryDate: string | null;
  error?: string;
}

const STORAGE_KEYS = {
  LICENSE_TOKEN: 'pos_license_token',
  LAST_KNOWN_TIME: 'pos_last_monotonic_time',
  MACHINE_ID: 'pos_machine_id'
};

// 1. Get or Generate persistent Terminal / Machine ID
export function getMachineId(): string {
  let machineId = localStorage.getItem(STORAGE_KEYS.MACHINE_ID);
  if (!machineId) {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    machineId = `POS-${randomHex}`;
    localStorage.setItem(STORAGE_KEYS.MACHINE_ID, machineId);
  }
  return machineId;
}

// 2. Monotonic Anti-Clock-Tampering Check
export function verifySystemClock(): boolean {
  const now = Date.now();
  const lastRecorded = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_KNOWN_TIME) || '0', 10);

  if (now < lastRecorded) {
    return false;
  }

  localStorage.setItem(STORAGE_KEYS.LAST_KNOWN_TIME, now.toString());
  return true;
}

// 3. Verify and Decode the License Token
export function verifyLicense(tokenString?: string): ValidationResult {
  const token = tokenString || localStorage.getItem(STORAGE_KEYS.LICENSE_TOKEN);

  if (!token) {
    return { isValid: false, isExpired: true, daysRemaining: 0, expiryDate: null, error: 'No license installed.' };
  }

  if (!verifySystemClock()) {
    return { isValid: false, isExpired: true, daysRemaining: 0, expiryDate: null, error: 'System clock tampering detected.' };
  }

  try {
    const signedBytes = decodeBase64(token.trim());
    const openedBytes = nacl.sign.open(signedBytes, EMBEDDED_PUBLIC_KEY);

    if (!openedBytes) {
      return { isValid: false, isExpired: true, daysRemaining: 0, expiryDate: null, error: 'Invalid or forged license key.' };
    }

    const payload: LicensePayload = JSON.parse(encodeUTF8(openedBytes));
    const currentMachineId = getMachineId();

    if (payload.machineId !== currentMachineId) {
      return { isValid: false, isExpired: true, daysRemaining: 0, expiryDate: null, error: 'License belongs to a different terminal.' };
    }

    const expiryTime = new Date(payload.validUntil).getTime();
    const diffMs = expiryTime - Date.now();

    if (diffMs <= 0) {
      return { isValid: false, isExpired: true, daysRemaining: 0, expiryDate: payload.validUntil, error: 'Subscription has expired.' };
    }

    return {
      isValid: true,
      isExpired: false,
      daysRemaining: Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
      expiryDate: payload.validUntil
    };
  } catch (err) {
    return { isValid: false, isExpired: true, daysRemaining: 0, expiryDate: null, error: 'Malformed or invalid license key.' };
  }
}

// 4. Save and Apply Token
export function applyLicenseToken(rawToken: string): ValidationResult {
  const result = verifyLicense(rawToken.trim());
  if (result.isValid) {
    localStorage.setItem(STORAGE_KEYS.LICENSE_TOKEN, rawToken.trim());
  }
  return result;
}