import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import type { Consultation, Patient } from '../types';

export default function FinalRecord({ consultation, patient }: { consultation: Consultation; patient: Patient | null }) {
  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-2.5 bg-status-approvedBg text-status-approved rounded-md px-4 py-3 text-sm">
        <CheckCircle2 size={17} />
        <span>
          Approved by {consultation.approved_by} on{' '}
          {consultation.approved_at && new Date(consultation.approved_at).toLocaleString()}
        </span>
      </div>

      <div className="bg-surface border border-line rounded-lg shadow-card">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Final clinical record</h3>
            <p className="text-xs text-ink-500 mt-0.5">{patient?.name} · {consultation.patient_id}</p>
          </div>
          <span className="font-mono text-xs text-ink-300">{consultation.id}</span>
        </div>
        <div className="px-6 py-5">
          <pre className="whitespace-pre-wrap font-sans text-sm text-ink-900 leading-relaxed">
            {consultation.final_record}
          </pre>
        </div>
      </div>

      <div className="flex items-start gap-2.5 text-xs text-ink-500">
        <ShieldCheck size={15} className="mt-0.5 shrink-0" />
        <p>
          This record was generated with AI assistance (model: {consultation.ai_model_used}) and reviewed
          and approved by a licensed doctor before being finalized. The full edit history is available in
          the audit trail.
        </p>
      </div>
    </div>
  );
}
