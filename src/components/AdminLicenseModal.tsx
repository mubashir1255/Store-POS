import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLicense } from '../context/LicenseContext';
import { api } from '../api/client';
import Modal from './Modal';

export default function AdminLicenseModal() {
  const { user } = useAuth();
  const {
    license,
    isModalOpen,
    closeModal,
    setCustomExpiry,
    revokeAccess,
    activateFromStartDate,
    addMonth,
    deductMonth,
    activateTrial,
    showToast,
  } = useLicense();

  const isAdmin = user?.role === 'admin' || (!user?.role && user?.username === 'admin');

  const [customDate, setCustomDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [cycleInput, setCycleInput] = useState('1');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isModalOpen && license.expiresAt) {
      const d = new Date(license.expiresAt);
      const isoDate = d.toISOString().split('T')[0];
      setCustomDate(isoDate);

      const nowIso = new Date().toISOString().split('T')[0];
      setStartDate(nowIso);
      setCycleInput(String(license.cycleCount));
    }
  }, [isModalOpen, license.expiresAt, license.cycleCount]);

  if (!isAdmin || !isModalOpen) {
    return null;
  }

  const handleSetCustomExpiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDate) return;
    const [year, month, day] = customDate.split('-').map(Number);
    const target = new Date(year, month - 1, day, 23, 59, 59, 999);
    const parsedCycle = parseInt(cycleInput, 10) || license.cycleCount;
    setCustomExpiry(target, parsedCycle);
  };

  const handleRevoke = () => {
    if (window.confirm('Lock the POS immediately?')) {
      revokeAccess();
      closeModal();
    }
  };

  const handleFreshActivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;
    const [year, month, day] = startDate.split('-').map(Number);
    const targetStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    activateFromStartDate(targetStart, 1);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword) {
      setPasswordError('Password cannot be empty.');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError('Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.saveUser({
        id: user?._id || user?.id || 1,
        username: user?.username || 'admin',
        fullname: user?.fullname || 'Administrator',
        password: newPassword,
        perm_products: 1,
        perm_categories: 1,
        perm_transactions: 1,
        perm_users: 1,
        perm_settings: 1,
      });
      setPasswordSuccess('Admin password updated and securely hashed.');
      showToast('Admin password successfully updated!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const expiryDateFormatted = new Date(license.expiresAt).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Modal title="Admin Control Panel" open={isModalOpen} onClose={closeModal} wide>
      <div className="admin-license-modal">

        {/* Status Overview */}
        <div className="admin-license-overview">
          <div className="admin-license-stat">
            <span className="admin-stat-label">Subscription Status</span>
            <div className="admin-stat-row">
              <span className={`admin-status-badge ${license.isExpired ? 'status-expired' : 'status-active'}`}>
                {license.isExpired ? 'EXPIRED (LOCKED)' : 'ACTIVE'}
              </span>
              <span className="admin-cycle-pill">Month {license.cycleCount}</span>
            </div>
          </div>
          <div className="admin-license-stat">
            <span className="admin-stat-label">Expiration Date</span>
            <span className="admin-stat-value">{expiryDateFormatted}</span>
          </div>
          <div className="admin-license-stat">
            <span className="admin-stat-label">Days Remaining</span>
            <span className="admin-stat-value">
              {license.isExpired ? '0 Days (Locked)' : `${license.daysRemaining} Days`}
            </span>
          </div>
        </div>

        <div className="admin-license-grid">
          {/* Left Column: License & Dates */}
          <div className="admin-section-box">
            <h3 className="admin-section-title">Subscription Expiry</h3>

            <form onSubmit={handleSetCustomExpiry} className="admin-form-group">
              <label className="field">
                <span>Access Valid Until:</span>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="input-text"
                  required
                />
              </label>
              <label className="field">
                <span>Cycle / Month Number:</span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={cycleInput}
                  onChange={(e) => setCycleInput(e.target.value)}
                  className="input-text"
                />
              </label>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.4rem' }}>
                Save Expiry Date
              </button>
            </form>

            <div className="admin-divider" />

            <div className="admin-quick-actions">
              <strong>Quick Adjust:</strong>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                <button
                  type="button"
                  className="btn btn-renew-emerald"
                  onClick={addMonth}
                  title="Add 30 days (+1 Month)"
                >
                  +30 Days
                </button>
                <button
                  type="button"
                  className="btn btn-danger-rose"
                  onClick={() => {
                    if (window.confirm('Deduct 30 days (-1 Month) from subscription?')) {
                      deductMonth();
                    }
                  }}
                  title="Deduct 30 days (-1 Month)"
                >
                  -30 Days
                </button>
                <button
                  type="button"
                  className="btn btn-indigo"
                  disabled={license.trialUsed}
                  onClick={() => {
                    if (window.confirm('Activate one-time 7-day trial?')) {
                      activateTrial(7);
                    }
                  }}
                  title={license.trialUsed ? 'Trial already consumed' : 'Activate 7-day trial'}
                >
                  7-Day Trial
                </button>
                <button
                  type="button"
                  className="btn btn-indigo"
                  disabled={license.trialUsed}
                  onClick={() => {
                    if (window.confirm('Activate one-time 15-day trial?')) {
                      activateTrial(15);
                    }
                  }}
                  title={license.trialUsed ? 'Trial already consumed' : 'Activate 15-day trial'}
                >
                  15-Day Trial
                </button>
              </div>
              {license.trialUsed && (
                <p className="trial-subtext" style={{ marginTop: '0.5rem' }}>
                  Trials already expended on this machine.
                </p>
              )}
            </div>

            <div className="admin-action-row" style={{ marginTop: '0.85rem' }}>
              <div>
                <strong style={{ color: 'var(--danger)' }}>Lock App Immediately</strong>
                <p className="admin-help-text">Instantly lock the cash register & checkout.</p>
              </div>
              <button type="button" className="btn btn-danger" onClick={handleRevoke}>
                Lock App Immediately
              </button>
            </div>

            <div className="admin-divider" />

            <form onSubmit={handleFreshActivation} className="admin-form-group">
              <strong>Fresh Installation Activation</strong>
              <p className="admin-help-text">Activate a new store cycle (+1 calendar month) starting from a specific date.</p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-text"
                  required
                />
                <button type="submit" className="btn btn-secondary">
                  Activate
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Password Rotation */}
          <div className="admin-section-box">
            <h3 className="admin-section-title">Admin Security</h3>
            <p className="admin-help-text" style={{ marginBottom: '1rem' }}>
              Change the password for the <strong>admin</strong> profile. Passwords are salted and securely hashed using bcrypt.
            </p>

            <form onSubmit={handlePasswordUpdate} className="admin-password-form">
              <div className="field">
                <label htmlFor="admin-new-pass">New Password</label>
                <input
                  id="admin-new-pass"
                  type="password"
                  placeholder="Enter new admin password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordLoading}
                />
              </div>

              <div className="field">
                <label htmlFor="admin-confirm-pass">Confirm Password</label>
                <input
                  id="admin-confirm-pass"
                  type="password"
                  placeholder="Re-type password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordLoading}
                />
              </div>

              {passwordError && <div className="admin-msg error">{passwordError}</div>}
              {passwordSuccess && <div className="admin-msg success">{passwordSuccess}</div>}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={passwordLoading || !newPassword}
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                {passwordLoading ? 'Saving…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Modal>
  );
}