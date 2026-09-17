import React, { useState } from 'react';
import { getMachineId, applyLicenseToken } from '../services/licenseService';

interface Props {
  isOpen: boolean;
  onUnlocked: () => void;
}

export function LicenseLockModal({ isOpen, onUnlocked }: Props) {
  if (!isOpen) return null;

  const machineId = getMachineId();
  const [tokenInput, setTokenInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = () => {
    setErrorMsg('');
    if (!tokenInput.trim()) {
      setErrorMsg('Please paste a license key.');
      return;
    }

    const result = applyLicenseToken(tokenInput.trim());
    if (result.isValid) {
      alert(`License activated! Valid until: ${new Date(result.expiryDate!).toLocaleDateString()}`);
      setTokenInput('');
      onUnlocked();
    } else {
      setErrorMsg(result.error || 'Activation failed. Invalid or corrupt key.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          textAlign: 'center',
          color: '#1e293b',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔒</div>
        <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
          Subscription Required
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>
          This POS terminal is locked. Please activate or renew your subscription to continue.
        </p>

        {/* Machine ID Box */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '18px',
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '700',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Terminal / Machine ID
          </span>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              marginTop: '6px',
            }}
          >
            <span
              style={{
                fontSize: '18px',
                fontWeight: '800',
                fontFamily: 'monospace',
                color: '#0f172a',
                letterSpacing: '0.05em',
              }}
            >
              {machineId}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              style={{
                fontSize: '11px',
                fontWeight: '600',
                padding: '4px 10px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#334155',
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
            Send this Terminal ID via WhatsApp to receive your key.
          </span>
        </div>

        {/* Text Area */}
        <div style={{ textAlign: 'left', marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '700',
              color: '#475569',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            Paste License Key
          </label>
          <textarea
            rows={3}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste your signed key here..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px',
              fontSize: '12px',
              fontFamily: 'monospace',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              outline: 'none',
              resize: 'none',
              background: '#f8fafc',
            }}
          />
        </div>

        {errorMsg && (
          <div
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              marginBottom: '16px',
              fontWeight: '500',
              textAlign: 'left',
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handleActivate}
          style={{
            width: '100%',
            padding: '12px',
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
          }}
        >
          Activate &amp; Unlock POS
        </button>
      </div>
    </div>
  );
}