import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, ShieldCheck, Plus } from 'lucide-react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import type { Consultation, Patient } from '../types';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const { doctor } = useAuth();
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listConsultations(), api.listPatients()]).then(([cs, ps]) => {
      setConsultations(cs);
      const map: Record<string, Patient> = {};
      ps.forEach(p => { map[p.id] = p; });
      setPatients(map);
      setLoading(false);
    });
  }, []);

  const today = consultations.filter(c => {
    const d = new Date(c.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const pendingReview = consultations.filter(c => c.status === 'ai_drafted' || c.status === 'pending_review');
  const approved = consultations.filter(c => c.status === 'approved');

  const stats = [
    { label: "Today's consultations", value: today.length, icon: FileText },
    { label: 'Pending review', value: pendingReview.length, icon: Clock },
    { label: 'Approved records', value: approved.length, icon: CheckCircle2 },
    { label: 'Audit events logged', value: consultations.length * 2, icon: ShieldCheck },
  ];

  return (
    <Layout title="Dashboard" subtitle="Overview of today's clinical documentation activity">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Good day, {doctor?.name?.split(' ').slice(-1)[0] || 'Doctor'}</h2>
          <p className="text-sm text-ink-500 mt-1">Review today's consultations and documentation.</p>
        </div>
        <button
          onClick={() => navigate('/consultations/new')}
          className="flex items-center gap-1.5 rounded-md bg-brand-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-900 transition-colors"
        >
          <Plus size={16} />
          New consultation
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-surface border border-line rounded-lg p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-ink-500">{label}</span>
              <Icon size={15} className="text-brand-500" strokeWidth={1.8} />
            </div>
            <p className="text-2xl font-semibold text-ink-900 font-mono">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-line rounded-lg shadow-card">
          <div className="px-5 py-4 border-b border-line">
            <h3 className="text-sm font-semibold text-ink-900">Recent consultations</h3>
          </div>
          {loading ? (
            <div className="p-5 text-sm text-ink-500">Loading…</div>
          ) : consultations.length === 0 ? (
            <div className="p-5 text-sm text-ink-500">No consultations yet. Start one from the button above.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-500 border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Patient ID</th>
                  <th className="px-5 py-2.5 font-medium">Patient</th>
                  <th className="px-5 py-2.5 font-medium">Time</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {consultations.slice(0, 8).map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-ink-500">{c.patient_id}</td>
                    <td className="px-5 py-3 text-ink-900">{patients[c.patient_id]?.name || '—'}</td>
                    <td className="px-5 py-3 text-ink-500">{timeAgo(c.created_at)}</td>
                    <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/consultations/${c.id}`} className="text-brand-700 hover:text-brand-900 font-medium text-xs">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-surface border border-line rounded-lg shadow-card p-5 h-fit">
          <h3 className="text-sm font-semibold text-ink-900 mb-3">Privacy status</h3>
          <p className="text-xs text-ink-500 mb-4">Privacy controls active</p>
          <ul className="space-y-2.5 text-sm text-ink-700">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-status-approved" />
              Access control
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-status-approved" />
              Audit logging
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-status-approved" />
              Data minimization
            </li>
          </ul>
          <Link to="/privacy" className="block mt-4 text-xs font-medium text-brand-700 hover:text-brand-900">
            View privacy & security →
          </Link>
        </div>
      </div>
    </Layout>
  );
}
