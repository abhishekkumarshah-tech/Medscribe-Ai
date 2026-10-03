import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import ErrorNotice from '../components/ErrorNotice';
import { api, getErrorMessage } from '../lib/api';
import type { Consultation, Patient } from '../types';

export default function Consultations() {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.listConsultations(), api.listPatients()])
      .then(([consultationResult, patientResult]) => {
        if (!active) return;
        setConsultations(consultationResult);
        setPatients(Object.fromEntries(patientResult.map((patient) => [patient.id, patient])));
      })
      .catch((err: unknown) => { if (active) setError(getErrorMessage(err, 'Could not load consultations.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <Layout title="Consultations" subtitle="Your consultation notes and documentation status">
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={() => navigate('/consultations/new')}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-900 sm:w-auto"
        >
          <Plus size={16} aria-hidden="true" /> New consultation
        </button>
      </div>
      {error && <ErrorNotice message={error} className="mb-4" />}

      <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
        {loading ? (
          <p role="status" className="p-5 text-sm text-ink-500">Loading consultations…</p>
        ) : consultations.length === 0 ? (
          <p className="p-5 text-sm text-ink-500">No consultations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-500">
                  <th scope="col" className="px-5 py-2.5 font-medium">ID</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Patient</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Created</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-5 py-2.5 font-medium"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((consultation) => (
                  <tr key={consultation.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-ink-500">{consultation.id}</td>
                    <td className="px-5 py-3 text-ink-900">{patients[consultation.patient_id]?.name || consultation.patient_id}</td>
                    <td className="px-5 py-3 text-ink-500">{new Date(consultation.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3"><StatusBadge status={consultation.status} /></td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/consultations/${consultation.id}`} className="font-medium text-xs text-brand-700 hover:text-brand-900">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
