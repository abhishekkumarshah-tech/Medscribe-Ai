import React from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/auth';

export default function Settings() {
  const { doctor } = useAuth();

  return (
    <Layout title="Settings" subtitle="Account and workspace preferences">
      <div className="max-w-xl bg-surface border border-line rounded-lg shadow-card p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">Name</label>
          <input
            readOnly
            value={doctor?.name || ''}
            className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink-900 bg-surface-muted"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">Email</label>
          <input
            readOnly
            value={doctor?.email || ''}
            className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink-900 bg-surface-muted"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1.5">Specialty</label>
          <input
            readOnly
            value={doctor?.specialty || ''}
            className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink-900 bg-surface-muted"
          />
        </div>
        <p className="text-xs text-ink-500 pt-2 border-t border-line">
          Account settings are read-only in this prototype.
        </p>
      </div>
    </Layout>
  );
}
