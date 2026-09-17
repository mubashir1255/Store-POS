import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPosBridge } from '../bridge';
import { getUploadsBase } from '../api/client';
import { verifyLicense } from '../services/licenseService';

export type NavView =
  | 'till'
  | 'catalog'
  | 'sales'
  | 'customers'
  | 'team'
  | 'settings';

type Props = {
  view: NavView;
  onNavigate: (view: NavView) => void;
  title: string;
  stats?: ReactNode;
  children: ReactNode;
  todaySales?: string;
  logo?: string;
};

export default function AppShell({
  view,
  onNavigate,
  title,
  stats,
  children,
  todaySales,
  logo,
}: Props) {
  const { user, logout, hasPerm, apiInfo } = useAuth();
  const logoSrc = logo ? `${getUploadsBase()}/${logo}` : '';

  // Current cryptographic license check
  const licenseStatus = verifyLicense();

  const items: { id: NavView; label: string; show: boolean }[] = [
    { id: 'till', label: 'Till', show: true },
    { id: 'catalog', label: 'Catalog', show: hasPerm('perm_products') || hasPerm('perm_categories') },
    { id: 'sales', label: 'Sales', show: hasPerm('perm_transactions') },
    { id: 'customers', label: 'Customers', show: true },
    { id: 'team', label: 'Team', show: hasPerm('perm_users') },
    { id: 'settings', label: 'Settings', show: hasPerm('perm_settings') },
  ];

  return (
    <div className="app">
      <aside className="nav">
        <div className="nav-brand">
          <div className="nav-brand-row">
            {logoSrc ? (
              <img className="nav-logo" src={logoSrc} alt="" />
            ) : (
              <div className="nav-logo nav-logo-fallback" aria-hidden />
            )}
            <div className="nav-brand-text">
              <strong>Store POS</strong>
              <span>{apiInfo?.mode?.replace(' Point of Sale', '') || 'Standalone'}</span>
            </div>
          </div>
        </div>
        {items
          .filter((i) => i.show)
          .map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-btn ${view === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        <div className="nav-spacer" />

        <button type="button" className="nav-btn" onClick={() => logout()}>
          Sign out
        </button>
        <button type="button" className="nav-btn" onClick={() => getPosBridge().quit()}>
          Quit
        </button>
        <div className="nav-meta">
          <div>{user?.fullname}</div>
          <div>Till #{apiInfo?.till || 1}</div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <h1>{title}</h1>
          {stats}
          <div className="spacer" />
          
          {/* Active Cryptographic License Badge */}
          <div
            className="stat-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: 600,
            }}
            title={
              licenseStatus.isValid && licenseStatus.expiryDate
                ? `Subscription active until ${new Date(licenseStatus.expiryDate).toLocaleDateString()}`
                : 'POS locked: valid subscription required'
            }
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: licenseStatus.isValid ? '#10b981' : '#ef4444',
              }}
            />
            {licenseStatus.isValid
              ? `Active · ${licenseStatus.daysRemaining}d left`
              : 'Expired / Locked'}
          </div>

          {todaySales != null && (
            <div className="stat-pill">Today {todaySales}</div>
          )}
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}