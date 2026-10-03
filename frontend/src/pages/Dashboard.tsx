import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, FileText, Plus, ShieldCheck } from 'lucide-react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import ErrorNotice from '../components/ErrorNotice';
import { useAuth } from '../lib/auth';
import { api, getErrorMessage } from '../lib/api';
import type { Consultation, Patient } from '../types';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 60_000) return 'Just now';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Dashboard() {
  const { doctor } = useAuth();
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [auditCount, setAuditCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.listConsultations(), api.listPatients(), api.listAudit()])
      .then(([consultationResult, patientResult, auditResult]) => {
        if (!active) return;
        setConsultations(consultationResult);
        setPatients(Object.fromEntries(patientResult.map((patient) => [patient.id, patient])));
        setAuditCount(auditResult.length);
      })
      .catch((err: unknown) => { if (active) setError(getErrorMessage(err, 'Could not load the dashboard.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const today = consultations.filter((consultation) =>
    new Date(consultation.created_at).toDateString() === new Date().toDateString(),
  );
  const pendingReview = consultations.filter((consultation) =>
    consultation.status === 'ai_drafted' || consultation.status === 'pending_review',
  );
  const approved = consultations.filter((consultation) => consultation.status === 'approved');

  const stats = [
    { label: "Today's consultations", value: today.length, icon: FileText },
    { label: 'Pending review', value: pendingReview.length, icon: Clock },
    { label: 'Approved records', value: approved.length, icon: CheckCircle2 },
    { label: 'Audit events logged', value: auditCount, icon: ShieldCheck },
  ];

  return (
    <Layout title="Dashboard" subtitle="Overview of your clinical documentation activity">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Good day, {doctor?.name?.split(' ').slice(-1)[0] || 'Doctor'}</h2>
          <p className="mt-1 text-sm text-ink-500">Review your consultations and documentation.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/consultations/new')}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-900 sm:w-auto"
        >
          <Plus size={16} aria-hidden="true" /> New consultation
        </button>
      </div>

      {error && <ErrorNotice message={error} className="mb-4" />}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-line bg-surface p-4 shadow-card">
            <div className="mb-2 flex items-start justify-between gap-2">
              <span className="text-xs text-ink-500">{label}</span>
              <Icon size={15} className="shrink-0 text-brand-500" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <p className="font-mono text-2xl font-semibold text-ink-900">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="min-w-0 rounded-lg border border-line bg-surface shadow-card lg:col-span-2">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold text-ink-900">Recent consultations</h2>
          </div>
          {loading ? (
            <p role="status" className="p-5 text-sm text-ink-500">Loading consultations…</p>
          ) : consultations.length === 0 ? (
            <p className="p-5 text-sm text-ink-500">No consultations yet. Start one using the button above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-500">
                    <th scope="col" className="px-5 py-2.5 font-medium">Patient ID</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Patient</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Time</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-5 py-2.5 font-medium"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.slice(0, 8).map((consultation) => (
                    <tr key={consultation.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-3 font-mono text-xs text-ink-500">{consultation.patient_id}</td>
                      <td className="px-5 py-3 text-ink-900">{patients[consultation.patient_id]?.name || '—'}</td>
                      <td className="px-5 py-3 text-ink-500" title={new Date(consultation.created_at).toLocaleString()}>{timeAgo(consultation.created_at)}</td>
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
        </section>

        <aside className="h-fit rounded-lg border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Privacy reminder</h2>
          <p className="mb-4 text-xs leading-relaxed text-ink-500">This prototype is for synthetic data only. AI output requires clinician review.</p>
          <ul className="space-y-2.5 text-sm text-ink-700">
            <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-status-approved" aria-hidden="true" /> Account-scoped access</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-status-approved" aria-hidden="true" /> Activity audit trail</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-status-approved" aria-hidden="true" /> Human approval required</li>
          </ul>
          <Link to="/privacy" className="mt-4 block text-xs font-medium text-brand-700 hover:text-brand-900">View privacy & security →</Link>
        </aside>
      </div>
    </Layout>
  );
}
