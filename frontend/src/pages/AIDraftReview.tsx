import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import FinalRecord from './FinalRecord';
import { api } from '../lib/api';
import type { Consultation, Patient } from '../types';

export default function AIDraftReview() {
  const { id } = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [draftText, setDraftText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showApprove, setShowApprove] = useState(false);

  async function load() {
    if (!id) return;
    const c = await api.getConsultation(id);
    setConsultation(c);
    setDraftText(c.edited_draft || c.ai_draft);
    const p = await api.getPatient(c.patient_id);
    setPatient(p);
  }

  useEffect(() => { load(); }, [id]);

  if (!consultation) {
    return <Layout title="Consultation"><p className="text-sm text-ink-500">Loading…</p></Layout>;
  }

  if (consultation.status === 'approved') {
    return (
      <Layout title="Final clinical record" subtitle={consultation.id}>
        <FinalRecord consultation={consultation} patient={patient} />
      </Layout>
    );
  }

  async function handleGenerate() {
    if (!id) return;
    setGenerating(true);
    try {
      const c = await api.generateDraft(id);
      setConsultation(c);
      setDraftText(c.edited_draft || c.ai_draft);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveEdits() {
    if (!id) return;
    setSaving(true);
    try {
      const c = await api.updateDraft(id, draftText);
      setConsultation(c);
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!id) return;
    setApproving(true);
    try {
      const c = await api.approve(id, draftText);
      setConsultation(c);
      setShowApprove(false);
    } finally {
      setApproving(false);
    }
  }

  return (
    <Layout title="AI draft review" subtitle={consultation.id}>
      <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-line rounded-lg shadow-card">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-900">Consultation notes</h3>
            <StatusBadge status={consultation.status} />
          </div>
          <div className="px-5 py-4">
            <p className="text-xs text-ink-500 mb-1">
              {patient?.name} · {consultation.patient_id}
            </p>
            <pre className="whitespace-pre-wrap font-sans text-sm text-ink-700 leading-relaxed mt-3">
              {consultation.raw_notes}
            </pre>
          </div>

          {consultation.status === 'draft_pending' && (
            <div className="px-5 pb-5">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 rounded-md bg-brand-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-900 transition-colors disabled:opacity-60"
              >
                <Sparkles size={15} />
                {generating ? 'Generating draft…' : 'Generate AI draft'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-surface border border-line rounded-lg shadow-card">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink-900">AI-generated draft</h3>
              {(consultation.status === 'ai_drafted' || consultation.status === 'pending_review') && (
                <span className="inline-flex items-center rounded-full bg-brand-100 text-brand-700 text-[11px] font-medium px-2 py-0.5">
                  AI-generated draft
                </span>
              )}
            </div>
          </div>

          {consultation.status === 'draft_pending' ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-ink-500">No draft yet. Generate one from the notes on the left.</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-4">
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  rows={14}
                  className="w-full rounded-md border border-line px-3 py-2.5 text-sm text-ink-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-y font-sans"
                />
                <p className="text-[11px] text-ink-500 mt-2">
                  Model: {consultation.ai_model_used} · Generated{' '}
                  {consultation.ai_generated_at && new Date(consultation.ai_generated_at).toLocaleString()}
                </p>
              </div>

              <div className="px-5 pb-5 flex items-center gap-3">
                <button
                  onClick={handleSaveEdits}
                  disabled={saving}
                  className="rounded-md border border-line text-sm font-medium px-4 py-2.5 text-ink-700 hover:bg-surface-muted transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save edits'}
                </button>
                <button
                  onClick={() => setShowApprove(true)}
                  className="flex items-center gap-2 rounded-md bg-brand-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-900 transition-colors"
                >
                  <CheckCircle2 size={15} />
                  Approve as final record
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showApprove && (
        <div className="fixed inset-0 bg-ink-900/30 flex items-center justify-center px-4 z-50">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-9 w-9 rounded-full bg-status-pendingBg flex items-center justify-center shrink-0">
                <AlertTriangle size={17} className="text-status-pending" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink-900">Approve this clinical record?</h3>
                <p className="text-xs text-ink-500 mt-1">
                  By approving, you confirm you have reviewed and, where needed, edited the AI-generated
                  draft and take responsibility for its accuracy as the final clinical record. This action
                  is logged in the audit trail and cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApprove(false)}
                className="rounded-md border border-line text-sm font-medium px-4 py-2 text-ink-700 hover:bg-surface-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="rounded-md bg-brand-700 text-white text-sm font-medium px-4 py-2 hover:bg-brand-900 transition-colors disabled:opacity-60"
              >
                {approving ? 'Approving…' : 'Confirm & approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
