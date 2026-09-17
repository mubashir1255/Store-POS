import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { LicenseProvider } from './context/LicenseContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <LicenseProvider>
        <App />
      </LicenseProvider>
    </AuthProvider>
  </React.StrictMode>
);

