import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Doctor } from '../types';
import { api } from './api';

interface AuthContextValue {
  doctor: Doctor | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('carenote_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then(setDoctor)
      .catch(() => localStorage.removeItem('carenote_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { token, doctor } = await api.login(email, password);
    localStorage.setItem('carenote_token', token);
    setDoctor(doctor);
  }

  function logout() {
    localStorage.removeItem('carenote_token');
    setDoctor(null);
  }

  return (
    <AuthContext.Provider value={{ doctor, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
