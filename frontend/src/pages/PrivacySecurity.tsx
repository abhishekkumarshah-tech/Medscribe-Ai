import React from 'react';
import { Lock, ShieldCheck, Eye, Database, FileWarning } from 'lucide-react';
import Layout from '../components/Layout';

const CONTROLS = [
  {
    icon: Lock,
    title: 'Access control',
    body: 'Only authenticated doctors can view patient notes and drafts. Sessions are scoped per doctor account.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit logging',
    body: 'Every notes entry, AI draft generation, edit, and approval is written to an immutable audit trail with actor, timestamp, and resource.',
  },
  {
    icon: Database,
    title: 'Data minimization',
    body: 'The AI service receives only the consultation notes and minimal patient context needed to structure a draft — nothing more.',
  },
  {
    icon: Eye,
    title: 'Human oversight',
    body: 'AI output is always labelled as an AI-generated draft. No content reaches a final clinical record without an explicit doctor approval step.',
  },
];

export default function PrivacySecurity() {
  return (
    <Layout title="Privacy & Security" subtitle="How Medscribe Ai protects patient data and keeps a human in the loop">
      <div className="max-w-3xl space-y-6">
        <div className="flex items-start gap-3 bg-brand-100 text-brand-900 rounded-lg px-5 py-4 text-sm">
          <FileWarning size={18} className="mt-0.5 shrink-0" />
          <p>
            This is a hackathon prototype using only synthetic, demo patient data. It is a documentation
            assistance tool, not a diagnostic system, and is not intended for use with real patient data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CONTROLS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-surface border border-line rounded-lg shadow-card p-5">
              <Icon size={18} className="text-brand-700 mb-3" strokeWidth={1.8} />
              <h3 className="text-sm font-semibold text-ink-900 mb-1.5">{title}</h3>
              <p className="text-xs text-ink-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-line rounded-lg shadow-card p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-2">AI use disclosure</h3>
          <p className="text-sm text-ink-700 leading-relaxed">
            Medscribe Ai never diagnoses patients and never adds clinical information that was not present
            in the doctor's own notes. Any suspected condition mentioned by the doctor is presented as
            "noted by physician," not as a confirmed diagnosis. A licensed doctor must review, edit as
            needed, and explicitly approve every draft before it becomes part of the final clinical record.
          </p>
        </div>
      </div>
    </Layout>
  );
}
