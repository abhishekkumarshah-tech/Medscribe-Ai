import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { api } from '../lib/api';
import type { Consultation, Patient } from '../types';

export default function Consultations() {
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

  return (
    <Layout title="Consultations" subtitle="All consultation notes and their documentation status">
      <div className="flex justify-end mb-5">
        <button
          onClick={() => navigate('/consultations/new')}
          className="flex items-center gap-1.5 rounded-md bg-brand-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-900 transition-colors"
        >
          <Plus size={16} />
          New consultation
        </button>
      </div>

      <div className="bg-surface border border-line rounded-lg shadow-card">
        {loading ? (
          <p className="p-5 text-sm text-ink-500">Loading…</p>
        ) : consultations.length === 0 ? (
          <p className="p-5 text-sm text-ink-500">No consultations yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-500 border-b border-line">
                <th className="px-5 py-2.5 font-medium">ID</th>
                <th className="px-5 py-2.5 font-medium">Patient</th>
                <th className="px-5 py-2.5 font-medium">Created</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {consultations.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-ink-500">{c.id}</td>
                  <td className="px-5 py-3 text-ink-900">{patients[c.patient_id]?.name || c.patient_id}</td>
                  <td className="px-5 py-3 text-ink-500">{new Date(c.created_at).toLocaleDateString()}</td>
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
    </Layout>
  );
}
