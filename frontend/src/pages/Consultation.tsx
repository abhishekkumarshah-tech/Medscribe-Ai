import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import type { Patient } from '../types';

export default function Consultation() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselected = params.get('patient') || '';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(preselected);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listPatients().then(setPatients);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId || !notes.trim()) {
      setError('Select a patient and enter consultation notes.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const c = await api.createConsultation(patientId, notes.trim());
      navigate(`/consultations/${c.id}`);
    } catch (err: any) {
      setError(err.message || 'Could not create consultation');
      setSubmitting(false);
    }
  }

  return (
    <Layout title="New consultation" subtitle="Enter consultation notes, then generate an AI-assisted draft">
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-lg shadow-card p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">Patient</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-surface"
            >
              <option value="">Select a patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">Consultation notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={10}
              placeholder="Write your consultation notes freely, as you normally would…"
              className="w-full rounded-md border border-line px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-y"
            />
            <p className="text-xs text-ink-500 mt-2">
              CareNote AI will structure these notes into a draft for you to review. It does not diagnose
              and never adds information you did not write.
            </p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-md bg-brand-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-900 transition-colors disabled:opacity-60"
          >
            <Sparkles size={15} />
            {submitting ? 'Saving…' : 'Save notes & continue'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
