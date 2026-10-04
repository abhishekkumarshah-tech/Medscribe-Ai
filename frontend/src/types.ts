export interface Doctor {
  id: string;
  name: string;
  email: string;
  specialty: string;
}

export interface AuthConfig {
  allow_signup: boolean;
  demo_login_enabled: boolean;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex?: string | null;
  mrn?: string | null;
  notes?: string | null;
}

export interface PatientCreate {
  name: string;
  age: number;
  sex?: string;
  notes?: string;
}

export type ConsultationStatus = 'draft_pending' | 'ai_drafted' | 'pending_review' | 'approved';

export interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  raw_notes: string;
  ai_draft: string;
  edited_draft: string;
  final_record: string;
  status: ConsultationStatus;
  ai_model_used: string;
  ai_generated_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string;
  detail: string;
}

export interface AuthResponse {
  token: string;
  doctor: Doctor;
}
