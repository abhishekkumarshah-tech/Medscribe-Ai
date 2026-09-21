import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import Consultation from './pages/Consultation';
import Consultations from './pages/Consultations';
import AIDraftReview from './pages/AIDraftReview';
import AuditTrail from './pages/AuditTrail';
import PrivacySecurity from './pages/PrivacySecurity';
import Settings from './pages/Settings';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { doctor, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-ink-500">Loading…</div>;
  if (!doctor) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/patients" element={<RequireAuth><Patients /></RequireAuth>} />
          <Route path="/patients/:id" element={<RequireAuth><PatientDetails /></RequireAuth>} />
          <Route path="/consultations" element={<RequireAuth><Consultations /></RequireAuth>} />
          <Route path="/consultations/new" element={<RequireAuth><Consultation /></RequireAuth>} />
          <Route path="/consultations/:id" element={<RequireAuth><AIDraftReview /></RequireAuth>} />
          <Route path="/audit" element={<RequireAuth><AuditTrail /></RequireAuth>} />
          <Route path="/privacy" element={<RequireAuth><PrivacySecurity /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
