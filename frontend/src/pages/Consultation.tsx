import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import ErrorNotice from '../components/ErrorNotice';
import { api, getErrorMessage } from '../lib/api';
import type { Patient } from '../types';

export default function Consultation() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselected = params.get('patient') || '';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientId, setPatientId] = useState(preselected);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.listPatients()
      .then((result) => { if (active) setPatients(result); })
      .catch((err: unknown) => { if (active) setError(getErrorMessage(err, 'Could not load your patients.')); })
      .finally(() => { if (active) setPatientsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (preselected) setPatientId(preselected);
  }, [preselected]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patientId || !notes.trim()) {
      setError('Select a patient and enter consultation notes.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const consultation = await api.createConsultation(patientId, notes.trim());
      navigate(`/consultations/${consultation.id}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not create consultation.'));
      setSubmitting(false);
    }
  }

  return (
    <Layout title="New consultation" subtitle="Save notes, then generate and review a structured draft">
      <div className="max-w-2xl">
        {error && <ErrorNotice message={error} className="mb-4" />}
        {!patientsLoading && patients.length === 0 && !error && (
          <div className="mb-4 rounded-md border border-line bg-surface p-4 text-sm text-ink-700">
            Add a patient before starting a consultation.{' '}
            <Link to="/patients" className="font-medium text-brand-700 underline underline-offset-2">Go to patients</Link>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-line bg-surface p-5 shadow-card sm:p-6">
          <div>
            <label htmlFor="consultation-patient" className="mb-1.5 block text-xs font-medium text-ink-700">Patient</label>
            <select
              id="consultation-patient"
              required
              disabled={patientsLoading || patients.length === 0}
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-surface-muted"
            >
              <option value="">{patientsLoading ? 'Loading patients…' : 'Select a patient…'}</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name} ({patient.id})</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="consultation-notes" className="mb-1.5 block text-xs font-medium text-ink-700">Consultation notes</label>
            <textarea
              id="consultation-notes"
              required
              minLength={1}
              maxLength={12000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={10}
              placeholder="Write the clinician's consultation notes…"
              className="w-full resize-y rounded-md border border-line px-3 py-2.5 text-sm leading-relaxed text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <div className="mt-2 flex flex-col gap-1 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
              <p>Drafting does not diagnose; review and approve all generated text before use.</p>
              <span className="shrink-0">{notes.length.toLocaleString()} / 12,000</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || patientsLoading || patients.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-900 disabled:opacity-60 sm:w-auto"
          >
            <span>{submitting ? 'Saving notes…' : 'Save notes & continue'}</span>
            {!submitting && <ArrowRight size={15} aria-hidden="true" />}
            {submitting && <Sparkles size={15} aria-hidden="true" />}
          </button>
        </form>
      </div>
    </Layout>
  );
}
