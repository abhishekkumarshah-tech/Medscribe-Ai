import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import ErrorNotice from '../components/ErrorNotice';
import FinalRecord from './FinalRecord';
import { api, getErrorMessage } from '../lib/api';
import type { Consultation, Patient } from '../types';

export default function AIDraftReview() {
  const { id } = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [draftText, setDraftText] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const activeConsultationId = useRef<string | undefined>(id);

  useEffect(() => {
    let active = true;
    activeConsultationId.current = id;
    setLoading(true);
    setGenerating(false);
    setSaving(false);
    setApproving(false);
    setShowApprove(false);
    setError('');
    setNotice('');
    setConsultation(null);
    setPatient(null);
    setDraftText('');
    if (!id) {
      setError('Consultation identifier is missing.');
      setLoading(false);
      return () => { active = false; };
    }
    const consultationId = id;

    async function load() {
      try {
        const result = await api.getConsultation(consultationId);
        const patientResult = await api.getPatient(result.patient_id);
        if (!active) return;
        setConsultation(result);
        setPatient(patientResult);
        setDraftText(result.edited_draft || result.ai_draft);
      } catch (err: unknown) {
        if (active) setError(getErrorMessage(err, 'Could not load this consultation.'));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [id]);

  async function handleGenerate() {
    const consultationId = id;
    if (!consultationId) return;
    setGenerating(true);
    setError('');
    setNotice('');
    try {
      const result = await api.generateDraft(consultationId);
      if (activeConsultationId.current !== consultationId) return;
      setConsultation(result);
      setDraftText(result.edited_draft || result.ai_draft);
      setNotice('Draft generated. Review all content before saving or approving.');
    } catch (err: unknown) {
      if (activeConsultationId.current === consultationId) {
        setError(getErrorMessage(err, 'Could not generate the draft.'));
      }
    } finally {
      if (activeConsultationId.current === consultationId) setGenerating(false);
    }
  }

  async function handleSaveEdits() {
    const consultationId = id;
    if (!consultationId || !draftText.trim()) {
      setError('The draft cannot be blank.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await api.updateDraft(consultationId, draftText);
      if (activeConsultationId.current !== consultationId) return;
      setConsultation(result);
      setDraftText(result.edited_draft);
      setNotice('Your edits have been saved.');
    } catch (err: unknown) {
      if (activeConsultationId.current === consultationId) {
        setError(getErrorMessage(err, 'Could not save draft edits.'));
      }
    } finally {
      if (activeConsultationId.current === consultationId) setSaving(false);
    }
  }

  async function handleApprove() {
    const consultationId = id;
    if (!consultationId || !draftText.trim()) {
      setError('The final record cannot be blank.');
      return;
    }
    setApproving(true);
    setError('');
    setNotice('');
    try {
      const result = await api.approve(consultationId, draftText);
      if (activeConsultationId.current !== consultationId) return;
      setConsultation(result);
      setDraftText(result.final_record);
      setShowApprove(false);
    } catch (err: unknown) {
      if (activeConsultationId.current === consultationId) {
        setError(getErrorMessage(err, 'Could not approve the final record.'));
      }
    } finally {
      if (activeConsultationId.current === consultationId) setApproving(false);
    }
  }

  if (loading) {
    return <Layout title="Consultation"><p role="status" className="text-sm text-ink-500">Loading consultation…</p></Layout>;
  }

  if (!consultation) {
    return (
      <Layout title="Consultation">
        {error && <ErrorNotice message={error} className="mb-4 max-w-xl" />}
        <Link to="/consultations" className="text-sm font-medium text-brand-700 underline underline-offset-2">Back to consultations</Link>
      </Layout>
    );
  }

  if (consultation.status === 'approved') {
    return (
      <Layout title="Final clinical record" subtitle={consultation.id}>
        <FinalRecord consultation={consultation} patient={patient} />
      </Layout>
    );
  }

  const hasDraft = consultation.status !== 'draft_pending';
  const hasUnsavedChanges = hasDraft && draftText !== consultation.edited_draft;
  const actionsBusy = generating || saving || approving;

  return (
    <Layout title="AI draft review" subtitle={consultation.id}>
      {error && <ErrorNotice message={error} className="mb-4" />}
      {notice && <p role="status" className="mb-4 rounded-md border border-brand-200 bg-brand-100 px-3 py-2.5 text-sm text-brand-900">{notice}</p>}

      <div className="grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">Consultation notes</h2>
            <StatusBadge status={consultation.status} />
          </div>
          <div className="px-5 py-4">
            <p className="mb-1 text-xs text-ink-500">{patient?.name || 'Patient'} · {consultation.patient_id}</p>
            <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-ink-700">{consultation.raw_notes}</pre>
          </div>
          {consultation.status === 'draft_pending' && (
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-900 disabled:opacity-60 sm:w-auto"
              >
                {generating ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {generating ? 'Generating draft…' : 'Generate AI draft'}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-surface shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">Draft for clinician review</h2>
            {hasDraft && (
              <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                AI-generated draft
              </span>
            )}
          </div>

          {!hasDraft ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-ink-500">No draft yet. Generate one from the consultation notes.</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-4">
                <label htmlFor="draft-text" className="sr-only">Review and edit the AI-generated draft</label>
                <textarea
                  id="draft-text"
                  required
                  maxLength={20000}
                  disabled={saving || approving}
                  value={draftText}
                  onChange={(event) => { setDraftText(event.target.value); setNotice(''); }}
                  rows={15}
                  className="w-full resize-y rounded-md border border-line px-3 py-2.5 text-sm leading-relaxed text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <p className="mt-2 break-words text-[11px] text-ink-500">
                  Source: {consultation.ai_model_used || 'unknown'} · Generated{' '}
                  {consultation.ai_generated_at ? new Date(consultation.ai_generated_at).toLocaleString() : 'time unavailable'}
                </p>
                <p className="mt-1 text-xs text-ink-500">AI output may be incomplete or incorrect. Verify against the original notes.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 px-5 pb-5">
                <button
                  type="button"
                  onClick={handleSaveEdits}
                  disabled={actionsBusy || !hasUnsavedChanges || !draftText.trim()}
                  className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:bg-surface-muted disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save edits'}
                </button>
                <button
                  type="button"
                  onClick={() => { setError(''); setShowApprove(true); }}
                  disabled={actionsBusy || !draftText.trim()}
                  className="flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-900 disabled:opacity-50"
                >
                  <CheckCircle2 size={15} aria-hidden="true" /> Approve as final record
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {showApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4 py-6" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="approve-heading"
            aria-describedby="approve-description"
            className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-pendingBg">
                <AlertTriangle size={17} className="text-status-pending" aria-hidden="true" />
              </div>
              <div>
                <h2 id="approve-heading" className="text-sm font-semibold text-ink-900">Approve this clinical record?</h2>
                <p id="approve-description" className="mt-1 text-xs leading-relaxed text-ink-500">
                  Confirm that you reviewed the generated text and take responsibility for the final record. Approval is recorded in the audit trail and cannot be changed through this application.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowApprove(false)}
                disabled={approving}
                className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink-700 hover:bg-surface-muted disabled:opacity-60"
              >Cancel</button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving || !draftText.trim()}
                className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-60"
              >
                {approving ? 'Approving…' : 'Confirm & approve'}
              </button>
            </div>
          </section>
        </div>
      )}
    </Layout>
  );
}
