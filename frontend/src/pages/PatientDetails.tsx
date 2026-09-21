import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { api } from '../lib/api';
import type { Patient, Consultation } from '../types';

export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);

  useEffect(() => {
    if (!id) return;
    api.getPatient(id).then(setPatient);
    api.patientConsultations(id).then(setConsultations);
  }, [id]);

  if (!patient) {
    return <Layout title="Patient"><p className="text-sm text-ink-500">Loading…</p></Layout>;
  }

  return (
    <Layout title={patient.name} subtitle={`Patient ID: ${patient.id}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface border border-line rounded-lg shadow-card p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4">Patient details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Patient ID</dt>
              <dd className="font-mono text-xs text-ink-900">{patient.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Name</dt>
              <dd className="text-ink-900">{patient.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Age</dt>
              <dd className="text-ink-900">{patient.age}</dd>
            </div>
            {patient.sex && (
              <div className="flex justify-between">
                <dt className="text-ink-500">Sex</dt>
                <dd className="text-ink-900">{patient.sex}</dd>
              </div>
            )}
            {patient.mrn && (
              <div className="flex justify-between">
                <dt className="text-ink-500">MRN</dt>
                <dd className="font-mono text-xs text-ink-900">{patient.mrn}</dd>
              </div>
            )}
          </dl>
          {patient.notes && (
            <div className="mt-4 pt-4 border-t border-line">
              <p className="text-xs text-ink-500 mb-1">Notes</p>
              <p className="text-sm text-ink-700">{patient.notes}</p>
            </div>
          )}
          <p className="mt-4 text-[11px] text-ink-300">Demo environment — synthetic patient data</p>
        </div>

        <div className="lg:col-span-2 bg-surface border border-line rounded-lg shadow-card">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-900">Consultation history</h3>
            <button
              onClick={() => navigate(`/consultations/new?patient=${patient.id}`)}
              className="flex items-center gap-1.5 rounded-md bg-brand-700 text-white text-xs font-medium px-3 py-2 hover:bg-brand-900 transition-colors"
            >
              <Plus size={14} />
              New consultation
            </button>
          </div>
          {consultations.length === 0 ? (
            <p className="p-5 text-sm text-ink-500">No consultations recorded yet for this patient.</p>
          ) : (
            <ul>
              {consultations.map((c) => (
                <li key={c.id} className="border-b border-line last:border-0">
                  <Link to={`/consultations/${c.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-muted transition-colors">
                    <div>
                      <p className="text-sm text-ink-900 font-mono">{c.id}</p>
                      <p className="text-xs text-ink-500 mt-0.5">{new Date(c.created_at).toLocaleString()}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
