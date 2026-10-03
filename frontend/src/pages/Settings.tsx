import React from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/auth';

export default function Settings() {
  const { doctor } = useAuth();

  return (
    <Layout title="Settings" subtitle="Account and workspace preferences">
      <section className="max-w-xl space-y-5 rounded-lg border border-line bg-surface p-6 shadow-card">
        <div>
          <label htmlFor="settings-name" className="mb-1.5 block text-xs font-medium text-ink-700">Name</label>
          <input id="settings-name" readOnly value={doctor?.name || ''} className="w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-sm text-ink-900" />
        </div>
        <div>
          <label htmlFor="settings-email" className="mb-1.5 block text-xs font-medium text-ink-700">Email</label>
          <input id="settings-email" readOnly value={doctor?.email || ''} className="w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-sm text-ink-900" />
        </div>
        <div>
          <label htmlFor="settings-specialty" className="mb-1.5 block text-xs font-medium text-ink-700">Specialty</label>
          <input id="settings-specialty" readOnly value={doctor?.specialty || ''} className="w-full rounded-md border border-line bg-surface-muted px-3 py-2 text-sm text-ink-900" />
        </div>
        <p className="border-t border-line pt-3 text-xs text-ink-500">Account profile fields are read-only in this demo. Session tokens expire after the configured session lifetime.</p>
      </section>
    </Layout>
  );
}
