import type {
  AuditEvent,
  AuthConfig,
  AuthResponse,
  Consultation,
  Doctor,
  Patient,
  PatientCreate,
} from '../types';

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const DEFAULT_TIMEOUT_MS = 30_000;
const AI_TIMEOUT_MS = 90_000;

let inMemorySessionToken: string | null = null;

export function getSessionToken(): string | null {
  if (inMemorySessionToken) return inMemorySessionToken;
  try {
    inMemorySessionToken = sessionStorage.getItem('carenote_token');
    return inMemorySessionToken;
  } catch {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('medscribe:storage-unavailable'));
    }
    return null;
  }
}

export function setSessionToken(token: string): boolean {
  inMemorySessionToken = token;
  try {
    sessionStorage.setItem('carenote_token', token);
    return true;
  } catch {
    return false;
  }
}

export function clearSessionToken(expectedToken?: string | null): boolean {
  if (expectedToken !== undefined && getSessionToken() !== expectedToken) return true;
  inMemorySessionToken = null;
  try {
    sessionStorage.removeItem('carenote_token');
    return true;
  } catch {
    return false;
  }
}

function authHeader(): string | null {
  return getSessionToken();
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => item && typeof item === 'object' && 'msg' in item ? String(item.msg) : '')
        .filter(Boolean);
      if (messages.length) return messages.join('. ');
    }
  }
  return `Request failed (${status}). Please try again.`;
}

async function request<T>(path: string, options: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const upstreamSignal = options.signal;
  const abortFromUpstream = () => controller.abort();
  if (upstreamSignal?.aborted) controller.abort();
  else upstreamSignal?.addEventListener('abort', abortFromUpstream, { once: true });

  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(options.headers);
  const token = authHeader();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  try {
    const response = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      let body: unknown = null;
      try {
        body = await response.json();
      } catch (parseError: unknown) {
        if (!(parseError instanceof SyntaxError)) throw parseError;
        // A plain gateway error keeps the same generic UI message as an unknown JSON error.
      }

      const isAuthRoute = path === '/auth/login' || path === '/auth/register' || path === '/auth/config';
      if (response.status === 401 && !isAuthRoute && typeof window !== 'undefined') {
        // An older in-flight request must not clear a newer successful login.
        const currentToken = getSessionToken();
        if (currentToken === token) {
          if (!clearSessionToken(token)) {
            window.dispatchEvent(new Event('medscribe:storage-unavailable'));
          }
          window.dispatchEvent(new Event('medscribe:session-expired'));
        }
      }
      throw new Error(errorMessage(body, response.status));
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('The service returned an unexpected response. Check the frontend API URL and backend deployment.');
    }
    try {
      return await response.json() as T;
    } catch {
      throw new Error('The service returned an invalid response. Please try again later.');
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('This request took too long. Please try again.');
    }
    if (error instanceof TypeError) {
      throw new Error('Could not reach the Medscribe service. Check your connection and try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    upstreamSignal?.removeEventListener('abort', abortFromUpstream);
  }
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const api = {
  authConfig: () => request<AuthConfig>('/auth/config'),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string, specialty: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, specialty }),
    }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => request<Doctor>('/auth/me'),

  listPatients: () => request<Patient[]>('/patients'),
  getPatient: (id: string) => request<Patient>(`/patients/${encodeURIComponent(id)}`),
  createPatient: (patient: PatientCreate) =>
    request<Patient>('/patients', { method: 'POST', body: JSON.stringify(patient) }),
  patientConsultations: (id: string) =>
    request<Consultation[]>(`/patients/${encodeURIComponent(id)}/consultations`),

  listConsultations: () => request<Consultation[]>('/consultations'),
  getConsultation: (id: string) => request<Consultation>(`/consultations/${encodeURIComponent(id)}`),
  createConsultation: (patient_id: string, raw_notes: string) =>
    request<Consultation>('/consultations', {
      method: 'POST',
      body: JSON.stringify({ patient_id, raw_notes }),
    }),
  generateDraft: (id: string) =>
    request<Consultation>(`/consultations/${encodeURIComponent(id)}/generate-draft`, { method: 'POST' }, AI_TIMEOUT_MS),
  updateDraft: (id: string, edited_draft: string) =>
    request<Consultation>(`/consultations/${encodeURIComponent(id)}/draft`, {
      method: 'PUT',
      body: JSON.stringify({ edited_draft }),
    }),
  approve: (id: string, final_text: string) =>
    request<Consultation>(`/consultations/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ final_text }),
    }),

  listAudit: () => request<AuditEvent[]>('/audit'),
};
