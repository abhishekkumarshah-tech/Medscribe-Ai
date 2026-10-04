import React from 'react';
import { Lock, ShieldCheck, Eye, Database, FileWarning } from 'lucide-react';
import Layout from '../components/Layout';

const CONTROLS = [
  {
    icon: Lock,
    title: 'Account-scoped access',
    body: 'Authenticated accounts see only their own patient and consultation records. Sessions are persisted server-side, expire automatically, and can be revoked on sign out.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit events',
    body: 'Patient creation, consultation creation, draft generation, draft edits, failures, and approvals are recorded with an actor, timestamp, and resource ID. Event details avoid copying clinical notes.',
  },
  {
    icon: Database,
    title: 'Data minimization',
    body: 'The default offline structurer receives only the consultation text. If a hosted AI provider is configured, only that text is sent; patient name, age, and sex are not added as context.',
  },
  {
    icon: Eye,
    title: 'Human oversight',
    body: 'Generated content is labelled as a draft. The application requires a clinician review and explicit approval before a final record is saved.',
  },
];

export default function PrivacySecurity() {
  return (
    <Layout title="Privacy & Security" subtitle="Data handling and human oversight in the Medscribe demo">
      <div className="max-w-3xl space-y-6">
        <div className="flex items-start gap-3 rounded-lg bg-brand-100 px-5 py-4 text-sm text-brand-900">
          <FileWarning size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            This is a prototype for synthetic data only. Do not enter real patient information. It is not a diagnostic system and has not been assessed or certified for clinical use or regulatory compliance.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CONTROLS.map(({ icon: Icon, title, body }) => (
            <section key={title} className="rounded-lg border border-line bg-surface p-5 shadow-card">
              <Icon size={18} className="mb-3 text-brand-700" strokeWidth={1.8} aria-hidden="true" />
              <h2 className="mb-1.5 text-sm font-semibold text-ink-900">{title}</h2>
              <p className="text-xs leading-relaxed text-ink-500">{body}</p>
            </section>
          ))}
        </div>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-2 text-sm font-semibold text-ink-900">AI provider disclosure</h2>
          <p className="text-sm leading-relaxed text-ink-700">
            Without an AI key, the app performs conservative local note structuring. If an Anthropic API key is configured, consultation text is sent to Anthropic for drafting and is subject to the provider's terms and retention practices. Only configure a hosted AI service after appropriate privacy, security, and legal review; this demo must not process real patient information.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-2 text-sm font-semibold text-ink-900">Clinical oversight</h2>
          <p className="text-sm leading-relaxed text-ink-700">
            Medscribe AI does not provide a guaranteed diagnosis. Generated drafts may be incomplete or incorrect. A clinician must verify all content against the source notes and explicitly approve a final record. Application audit events are append-only through the user interface; this is not a tamper-proof compliance audit system.
          </p>
        </section>
      </div>
    </Layout>
  );
}
