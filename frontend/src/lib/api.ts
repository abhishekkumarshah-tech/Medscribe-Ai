import type { Doctor, Patient, Consultation, AuditEvent } from '../types';

const BASE = import.meta.env.VITE_API_URL || '/api';

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('carenote_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; doctor: Doctor }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<Doctor>('/auth/me'),

  listPatients: () => request<Patient[]>('/patients'),
  getPatient: (id: string) => request<Patient>(`/patients/${id}`),
  patientConsultations: (id: string) => request<Consultation[]>(`/patients/${id}/consultations`),

  listConsultations: () => request<Consultation[]>('/consultations'),
  getConsultation: (id: string) => request<Consultation>(`/consultations/${id}`),
  createConsultation: (patient_id: string, raw_notes: string) =>
    request<Consultation>('/consultations', {
      method: 'POST',
      body: JSON.stringify({ patient_id, raw_notes }),
    }),
  generateDraft: (id: string) =>
    request<Consultation>(`/consultations/${id}/generate-draft`, { method: 'POST' }),
  updateDraft: (id: string, edited_draft: string) =>
    request<Consultation>(`/consultations/${id}/draft`, {
      method: 'PUT',
      body: JSON.stringify({ edited_draft }),
    }),
  approve: (id: string, final_text: string) =>
    request<Consultation>(`/consultations/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ final_text }),
    }),

  listAudit: () => request<AuditEvent[]>('/audit'),
};
