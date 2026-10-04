import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { AuthConfig, Doctor } from '../types';
import { api, clearSessionToken, getSessionToken, setSessionToken } from './api';

interface AuthContextValue {
  doctor: Doctor | null;
  loading: boolean;
  authConfig: AuthConfig;
  logoutWarning: string;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, specialty: string) => Promise<void>;
  logout: () => Promise<void>;
}

const DEFAULT_AUTH_CONFIG: AuthConfig = { allow_signup: false, demo_login_enabled: false };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [authConfig, setAuthConfig] = useState<AuthConfig>(DEFAULT_AUTH_CONFIG);
  const [logoutWarning, setLogoutWarning] = useState('');
  const authAttemptVersion = useRef(0);

  useEffect(() => {
    let active = true;
    const initialAuthAttempt = authAttemptVersion.current;
    const onSessionExpired = () => {
      if (active) setDoctor(null);
    };
    const onStorageUnavailable = () => {
      if (active) setLogoutWarning('This browser blocked session storage; sign-in and sign-out may not persist in this tab.');
    };
    window.addEventListener('medscribe:session-expired', onSessionExpired);
    window.addEventListener('medscribe:storage-unavailable', onStorageUnavailable);

    const token = getSessionToken();

    const configRequest = api.authConfig().catch(() => DEFAULT_AUTH_CONFIG);
    const doctorRequest = token
      ? api.me().catch(() => {
          if (!clearSessionToken(token)) onStorageUnavailable();
          return null;
        })
      : Promise.resolve(null);

    Promise.all([configRequest, doctorRequest]).then(([config, currentDoctor]) => {
      if (!active || authAttemptVersion.current !== initialAuthAttempt) return;
      setAuthConfig(config);
      setDoctor(currentDoctor);
      setLoading(false);
    });

    return () => {
      active = false;
      window.removeEventListener('medscribe:session-expired', onSessionExpired);
      window.removeEventListener('medscribe:storage-unavailable', onStorageUnavailable);
    };
  }, []);

  async function login(email: string, password: string) {
    const { token, doctor: currentDoctor } = await api.login(email, password);
    const stored = setSessionToken(token);
    authAttemptVersion.current += 1;
    setLoading(false);
    setLogoutWarning(stored ? '' : 'Session storage is blocked; this sign-in will last only until you reload or close this tab.');
    setDoctor(currentDoctor);
  }

  async function register(name: string, email: string, password: string, specialty: string) {
    const { token, doctor: currentDoctor } = await api.register(name, email, password, specialty);
    const stored = setSessionToken(token);
    authAttemptVersion.current += 1;
    setLoading(false);
    setLogoutWarning(stored ? '' : 'Session storage is blocked; this sign-in will last only until you reload or close this tab.');
    setDoctor(currentDoctor);
  }

  async function logout() {
    authAttemptVersion.current += 1;
    const revokeRequest = api.logout();
    let warning = clearSessionToken() ? '' : 'This browser could not clear its saved session token.';
    setDoctor(null);

    try {
      await revokeRequest;
    } catch {
      warning = 'Signed out on this device. The server could not confirm session revocation; the session will expire automatically.';
    }
    setLogoutWarning(warning);
  }

  return (
    <AuthContext.Provider value={{ doctor, loading, authConfig, logoutWarning, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
