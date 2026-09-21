import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import type { AuditEvent } from '../types';

const ACTION_LABEL: Record<string, string> = {
  CONSULTATION_CREATED: 'Consultation notes entered',
  AI_DRAFT_GENERATED: 'AI draft generated',
  DRAFT_EDITED: 'Draft edited by doctor',
  RECORD_APPROVED: 'Final record approved',
};

export default function AuditTrail() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listAudit().then((e) => { setEvents(e); setLoading(false); });
  }, []);

  return (
    <Layout title="Audit Trail" subtitle="Immutable log of every documentation action, for compliance and review">
      <div className="bg-surface border border-line rounded-lg shadow-card">
        {loading ? (
          <p className="p-5 text-sm text-ink-500">Loading…</p>
        ) : events.length === 0 ? (
          <p className="p-5 text-sm text-ink-500">No audit events yet.</p>
        ) : (
          <ul>
            {events.map((e) => (
              <li key={e.id} className="border-b border-line last:border-0 px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink-900">{ACTION_LABEL[e.action] || e.action}</p>
                  <span className="font-mono text-xs text-ink-300">{new Date(e.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-xs text-ink-500 mt-1">{e.detail}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-ink-300 font-mono">
                  <span>actor: {e.actor}</span>
                  <span>{e.resource_type}: {e.resource_id}</span>
                  <span>id: {e.id}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
