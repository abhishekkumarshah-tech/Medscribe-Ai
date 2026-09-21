import React from 'react';
import type { ConsultationStatus } from '../types';

const CONFIG: Record<ConsultationStatus, { label: string; text: string; bg: string }> = {
  draft_pending: { label: 'Notes only', text: 'text-status-draft', bg: 'bg-status-draftBg' },
  ai_drafted: { label: 'AI draft ready', text: 'text-brand-700', bg: 'bg-brand-100' },
  pending_review: { label: 'Pending review', text: 'text-status-pending', bg: 'bg-status-pendingBg' },
  approved: { label: 'Approved', text: 'text-status-approved', bg: 'bg-status-approvedBg' },
};

export default function StatusBadge({ status }: { status: ConsultationStatus }) {
  const c = CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${c.text} ${c.bg}`}>
      {c.label}
    </span>
  );
}
