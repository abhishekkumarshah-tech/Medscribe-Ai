import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import type { Consultation, Patient } from '../types';

export default function FinalRecord({ consultation, patient }: { consultation: Consultation; patient: Patient | null }) {
  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start gap-2.5 rounded-md bg-status-approvedBg px-4 py-3 text-sm text-status-approved sm:items-center">
        <CheckCircle2 size={17} className="mt-0.5 shrink-0 sm:mt-0" aria-hidden="true" />
        <span>
          Approved by {consultation.approved_by || 'clinician'}
          {consultation.approved_at ? ` on ${new Date(consultation.approved_at).toLocaleString()}` : ''}
        </span>
      </div>

      <section className="rounded-lg border border-line bg-surface shadow-card">
        <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink-900">Final clinical record</h2>
            <p className="mt-0.5 break-words text-xs text-ink-500">{patient?.name || 'Patient'} · {consultation.patient_id}</p>
          </div>
          <span className="break-all font-mono text-xs text-ink-500">{consultation.id}</span>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-ink-900">{consultation.final_record}</pre>
        </div>
      </section>

      <div className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-500">
        <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Drafting source: {consultation.ai_model_used || 'not recorded'}. This output may be incomplete or incorrect and is not a diagnosis; it was explicitly approved by a clinician. Review the source notes if clarification is needed.
        </p>
      </div>
    </div>
  );
}
