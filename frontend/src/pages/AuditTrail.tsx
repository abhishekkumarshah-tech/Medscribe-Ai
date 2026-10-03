import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import ErrorNotice from '../components/ErrorNotice';
import { api, getErrorMessage } from '../lib/api';
import type { AuditEvent } from '../types';

const ACTION_LABEL: Record<string, string> = {
  PATIENT_CREATED: 'Patient record created',
  CONSULTATION_CREATED: 'Consultation notes entered',
  AI_DRAFT_GENERATED: 'AI draft generated',
  AI_DRAFT_FAILED: 'AI draft generation failed',
  DRAFT_EDITED: 'Draft edited by clinician',
  RECORD_APPROVED: 'Final record approved',
};

export default function AuditTrail() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.listAudit()
      .then((result) => { if (active) setEvents(result); })
      .catch((err: unknown) => { if (active) setError(getErrorMessage(err, 'Could not load the audit trail.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <Layout title="Audit Trail" subtitle="Append-only record of documentation actions for your account">
      {error && <ErrorNotice message={error} className="mb-4" />}
      <div className="rounded-lg border border-line bg-surface shadow-card">
        {loading ? (
          <p role="status" className="p-5 text-sm text-ink-500">Loading audit events…</p>
        ) : events.length === 0 ? (
          <p className="p-5 text-sm text-ink-500">No audit events yet.</p>
        ) : (
          <ul>
            {events.map((event) => (
              <li key={event.id} className="border-b border-line px-5 py-4 last:border-0">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-ink-900">{ACTION_LABEL[event.action] || event.action}</p>
                  <time dateTime={event.timestamp} className="font-mono text-xs text-ink-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </time>
                </div>
                <p className="mt-1 text-xs text-ink-500">{event.detail}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-300 font-mono">
                  <span>actor: {event.actor}</span>
                  <span>{event.resource_type}: {event.resource_id}</span>
                  <span>id: {event.id}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
