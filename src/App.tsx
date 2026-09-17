import { useEffect, useState } from 'react';
import { verifyLicense, ValidationResult } from './services/licenseService';
import { LicenseLockModal } from './components/LicenseLockModal';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import PosPage from './pages/PosPage';

export default function App() {
  const { ready, user } = useAuth();

  // 1. Initialize license state
  const [licenseStatus, setLicenseStatus] = useState<ValidationResult>(() => verifyLicense());

  // 2. Helper to re-check status after activation
  const refreshLicense = () => {
    setLicenseStatus(verifyLicense());
  };

  // 3. Periodic background check every 60s to prevent clock tricks & catch expiration
  useEffect(() => {
    refreshLicense();
    const interval = setInterval(refreshLicense, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!ready) {
    return (
      <div className="login-wrap">
        <div className="panel login-card">
          <h1>Store POS</h1>
          <p>Starting…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Active License Gate: If missing or expired, lock screen covers everything */}
      <LicenseLockModal 
        isOpen={!licenseStatus.isValid} 
        onUnlocked={refreshLicense} 
      />

      {/* Main App Routing */}
      {!user ? <LoginPage /> : <PosPage />}
    </>
  );
}