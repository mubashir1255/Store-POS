import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

const LICENSE_STORAGE_KEY = 'pos_subscription_license_v1';
export const DAY_MS = 86400000; // 86,400,000 ms = 24 * 60 * 60 * 1000
export const THIRTY_DAYS_MS = 30 * DAY_MS; // 30 days = 2,592,000,000 ms

export interface LicenseState {
  expiresAt: number;
  cycleCount: number;
  isExpired: boolean;
  daysRemaining: number;
  trialUsed: boolean;
}

interface StoredLicenseData {
  expiresAt: number;
  cycleCount: number;
  trialUsed?: boolean;
  lastRenewedAt?: number;
}

interface LicenseContextType {
  license: LicenseState;
  renewSubscription: () => { success: boolean; newExpiryDate: Date; cycleCount: number };
  addMonth: () => void;
  deductMonth: () => void;
  activateTrial: (days: 7 | 15) => boolean;
  setCustomExpiry: (expiryDate: Date, cycleCount?: number) => void;
  revokeAccess: () => void;
  activateFromStartDate: (startDate: Date, cycleCount?: number) => void;
  refreshLicense: () => void;
  toastMessage: string | null;
  clearToast: () => void;
  showToast: (msg: string) => void;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const LicenseContext = createContext<LicenseContextType | null>(null);

/**
 * Adds exactly +1 calendar month to a given date, safely clamping to the last day of target month if needed.
 */
export function addOneCalendarMonth(fromDate: Date): Date {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth(); // 0-11
  const day = fromDate.getDate();
  const hours = fromDate.getHours();
  const minutes = fromDate.getMinutes();
  const seconds = fromDate.getSeconds();
  const ms = fromDate.getMilliseconds();

  const targetYear = month === 11 ? year + 1 : year;
  const targetMonth = (month + 1) % 12;

  // Last day of targetMonth
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(day, daysInTargetMonth);

  return new Date(targetYear, targetMonth, targetDay, hours, minutes, seconds, ms);
}

function loadStoredLicense(): StoredLicenseData {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.expiresAt === 'number' && typeof parsed.cycleCount === 'number') {
          return {
            ...parsed,
            trialUsed: Boolean(parsed.trialUsed),
          };
        }
      }
    }
  } catch {
    /* fallback to defaults */
  }

  // Default initial cycle: Month 1 with 30 active days from now
  const now = new Date();
  const initialExpiry = now.getTime() + THIRTY_DAYS_MS;

  const defaultState: StoredLicenseData = {
    expiresAt: initialExpiry,
    cycleCount: 1,
    trialUsed: false,
    lastRenewedAt: now.getTime(),
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(defaultState));
    }
  } catch {
    /* ignore storage errors */
  }

  return defaultState;
}

function computeLicenseState(stored: StoredLicenseData): LicenseState {
  const now = Date.now();
  const msRemaining = stored.expiresAt - now;
  const isExpired = msRemaining <= 0;
  const daysRemaining = isExpired ? 0 : Math.ceil(msRemaining / DAY_MS);

  return {
    expiresAt: stored.expiresAt,
    cycleCount: stored.cycleCount,
    isExpired,
    daysRemaining,
    trialUsed: Boolean(stored.trialUsed),
  };
}

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredLicenseData>(loadStoredLicense);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const license = useMemo(() => computeLicenseState(stored), [stored]);

  const refreshLicense = useCallback(() => {
    setStored(loadStoredLicense());
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const saveState = useCallback((updated: StoredLicenseData) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Failed to save license to storage:', err);
    }
    setStored(updated);
  }, []);

  const renewSubscription = useCallback(() => {
    const currentStored = loadStoredLicense();
    const now = Date.now();
    const currentExpiry = currentStored.expiresAt;

    // Add +1 calendar month to either current expiry date (if renewed early) or current date (if expired)
    const baseDate = now < currentExpiry ? new Date(currentExpiry) : new Date(now);
    const newExpiryDateObj = addOneCalendarMonth(baseDate);
    const newExpiresAt = newExpiryDateObj.getTime();
    const newCycleCount = currentStored.cycleCount + 1;

    const updated: StoredLicenseData = {
      ...currentStored,
      expiresAt: newExpiresAt,
      cycleCount: newCycleCount,
      lastRenewedAt: now,
    };

    saveState(updated);

    const formattedDate = newExpiryDateObj.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const msg = `Subscription successfully renewed for 1 calendar month! Active until ${formattedDate} (Month ${newCycleCount}).`;
    showToast(msg);

    return {
      success: true,
      newExpiryDate: newExpiryDateObj,
      cycleCount: newCycleCount,
    };
  }, [saveState, showToast]);

  // "+1 Month" (Green): Adds 30 days (30 * 86,400,000 ms) to expiryDate. Set isExpired = false.
  const addMonth = useCallback(() => {
    const currentStored = loadStoredLicense();
    const now = Date.now();
    const base = Math.max(now, currentStored.expiresAt);
    const newExpiresAt = base + THIRTY_DAYS_MS;
    const newCycleCount = currentStored.cycleCount + 1;

    const updated: StoredLicenseData = {
      ...currentStored,
      expiresAt: newExpiresAt,
      cycleCount: newCycleCount,
      lastRenewedAt: now,
    };

    saveState(updated);

    const formatted = new Date(newExpiresAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    showToast(`Added +30 Days (+1 Month)! Active until ${formatted} (Month ${newCycleCount}).`);
  }, [saveState, showToast]);

  // "-1 Month" (Red/Rose): Deducts 30 days (30 * 86,400,000 ms) from expiryDate.
  // If the new expiryDate is less than Date.now(), clamp to Date.now() - 1000 and trigger expired lock state.
  const deductMonth = useCallback(() => {
    const currentStored = loadStoredLicense();
    const now = Date.now();
    let newExpiresAt = currentStored.expiresAt - THIRTY_DAYS_MS;
    if (newExpiresAt < now) {
      newExpiresAt = now - 1000; // clamp to past to immediately lock
    }
    const newCycleCount = Math.max(1, currentStored.cycleCount - 1);

    const updated: StoredLicenseData = {
      ...currentStored,
      expiresAt: newExpiresAt,
      cycleCount: newCycleCount,
    };

    saveState(updated);

    if (newExpiresAt <= now) {
      showToast('Deducted 30 days (-1 Month). Subscription is now EXPIRED and cash register is locked.');
    } else {
      const formatted = new Date(newExpiresAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      showToast(`Deducted 30 days (-1 Month). Active until ${formatted} (Month ${newCycleCount}).`);
    }
  }, [saveState, showToast]);

  // "7-Day Trial" or "15-Day Trial" (Indigo): Disabled if trialUsed === true.
  const activateTrial = useCallback(
    (days: 7 | 15): boolean => {
      const currentStored = loadStoredLicense();
      if (currentStored.trialUsed) {
        showToast('Trial has already been consumed on this machine.');
        return false;
      }

      const now = Date.now();
      const newExpiresAt = now + days * DAY_MS;

      const updated: StoredLicenseData = {
        ...currentStored,
        expiresAt: newExpiresAt,
        trialUsed: true,
        lastRenewedAt: now,
      };

      saveState(updated);

      const formatted = new Date(newExpiresAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      showToast(`One-time ${days}-Day Trial activated! Valid until ${formatted}.`);
      return true;
    },
    [saveState, showToast]
  );

  const setCustomExpiry = useCallback(
    (expiryDate: Date, customCycle?: number) => {
      const currentStored = loadStoredLicense();
      const updated: StoredLicenseData = {
        ...currentStored,
        expiresAt: expiryDate.getTime(),
        cycleCount: customCycle ?? currentStored.cycleCount,
        lastRenewedAt: Date.now(),
      };

      saveState(updated);

      const formatted = expiryDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      showToast(`Subscription expiration updated to ${formatted}.`);
    },
    [saveState, showToast]
  );

  const revokeAccess = useCallback(() => {
    const currentStored = loadStoredLicense();
    // Set to 1 hour in the past to immediately trigger expired state
    const pastTime = Date.now() - 3600000;
    const updated: StoredLicenseData = {
      ...currentStored,
      expiresAt: pastTime,
    };

    saveState(updated);
    showToast('Subscription access has been revoked. Cash register is now locked.');
  }, [saveState, showToast]);

  const activateFromStartDate = useCallback(
    (startDate: Date, customCycle: number = 1) => {
      const nextExpiry = addOneCalendarMonth(startDate);
      const updated: StoredLicenseData = {
        ...currentStored,
        expiresAt: nextExpiry.getTime(),
        cycleCount: customCycle,
        lastRenewedAt: startDate.getTime(),
      };

      saveState(updated);

      const formatted = nextExpiry.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      showToast(`Fresh activation initialized from ${startDate.toLocaleDateString()}! Active until ${formatted}.`);
    },
    [saveState, showToast]
  );

  // Daily & periodic expiration check (every 30s) and on window focus
  useEffect(() => {
    const interval = setInterval(() => {
      setStored(loadStoredLicense());
    }, 30000);

    const onFocus = () => setStored(loadStoredLicense());
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const value = useMemo(
    () => ({
      license,
      renewSubscription,
      addMonth,
      deductMonth,
      activateTrial,
      setCustomExpiry,
      revokeAccess,
      activateFromStartDate,
      refreshLicense,
      toastMessage,
      clearToast,
      showToast,
      isModalOpen,
      openModal,
      closeModal,
    }),
    [
      license,
      renewSubscription,
      addMonth,
      deductMonth,
      activateTrial,
      setCustomExpiry,
      revokeAccess,
      activateFromStartDate,
      refreshLicense,
      toastMessage,
      clearToast,
      showToast,
      isModalOpen,
      openModal,
      closeModal,
    ]
  );

  return (
    <LicenseContext.Provider value={value}>
      {children}
      {toastMessage && (
        <div className="license-toast-overlay">
          <div className="license-toast">
            <span className="license-toast-icon">✨</span>
            <div className="license-toast-text">{toastMessage}</div>
            <button type="button" className="license-toast-close" onClick={clearToast}>
              ✕
            </button>
          </div>
        </div>
      )}
    </LicenseContext.Provider>
  );
}

export function useLicense(): LicenseContextType {
  const ctx = useContext(LicenseContext);
  if (!ctx) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return ctx;
}
