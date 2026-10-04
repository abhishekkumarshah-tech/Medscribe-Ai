import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import ErrorNotice from '../components/ErrorNotice';
import { api, getErrorMessage } from '../lib/api';
import type { Consultation, Patient } from '../types';

export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!id) {
      setError('Patient identifier is missing.');
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    setError('');
    Promise.all([api.getPatient(id), api.patientConsultations(id)])
      .then(([patientResult, consultationResult]) => {
        if (!active) return;
        setPatient(patientResult);
        setConsultations(consultationResult);
      })
      .catch((err: unknown) => { if (active) setError(getErrorMessage(err, 'Could not load patient details.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <Layout title="Patient"><p role="status" className="text-sm text-ink-500">Loading patient…</p></Layout>;
  }

  if (!patient) {
    return (
      <Layout title="Patient">
        <ErrorNotice message={error || 'Patient not found.'} className="mb-4 max-w-xl" />
        <Link to="/patients" className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900">
          <ArrowLeft size={15} aria-hidden="true" /> Back to patients
        </Link>
      </Layout>
    );
  }

  return (
    <Layout title={patient.name} subtitle={`Patient ID: ${patient.id}`}>
      {error && <ErrorNotice message={error} className="mb-4" />}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold text-ink-900">Patient details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink-500">Patient ID</dt><dd className="font-mono text-xs text-ink-900">{patient.id}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-500">Name</dt><dd className="text-right text-ink-900">{patient.name}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-500">Age</dt><dd className="text-ink-900">{patient.age}</dd></div>
            {patient.sex && <div className="flex justify-between gap-3"><dt className="text-ink-500">Sex</dt><dd className="text-ink-900">{patient.sex}</dd></div>}
            {patient.mrn && <div className="flex justify-between gap-3"><dt className="text-ink-500">MRN</dt><dd className="break-all text-right font-mono text-xs text-ink-900">{patient.mrn}</dd></div>}
          </dl>
          {patient.notes && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-1 text-xs text-ink-500">Notes</p>
              <p className="whitespace-pre-wrap break-words text-sm text-ink-700">{patient.notes}</p>
            </div>
          )}
          <p className="mt-4 text-[11px] text-ink-500">Demo environment — use synthetic patient data only</p>
        </section>

        <section className="rounded-lg border border-line bg-surface shadow-card lg:col-span-2">
          <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Consultation history</h2>
            <button
              type="button"
              onClick={() => navigate(`/consultations/new?patient=${encodeURIComponent(patient.id)}`)}
              className="flex items-center justify-center gap-1.5 rounded-md bg-brand-700 px-3 py-2 text-xs font-medium text-white hover:bg-brand-900 transition-colors"
            >
              <Plus size={14} aria-hidden="true" /> New consultation
            </button>
          </div>
          {consultations.length === 0 ? (
            <p className="p-5 text-sm text-ink-500">No consultations recorded yet for this patient.</p>
          ) : (
            <ul>
              {consultations.map((consultation) => (
                <li key={consultation.id} className="border-b border-line last:border-0">
                  <Link to={`/consultations/${consultation.id}`} className="flex flex-col gap-2 px-5 py-3.5 transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-mono text-sm text-ink-900">{consultation.id}</p>
                      <time dateTime={consultation.created_at} className="mt-0.5 block text-xs text-ink-500">
                        {new Date(consultation.created_at).toLocaleString()}
                      </time>
                    </div>
                    <StatusBadge status={consultation.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Layout>
  );
}
