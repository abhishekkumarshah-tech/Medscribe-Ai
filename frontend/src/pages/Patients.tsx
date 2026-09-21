import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import type { Patient } from '../types';

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listPatients().then((p) => { setPatients(p); setLoading(false); });
  }, []);

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) || p.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Layout title="Patients" subtitle="Demo environment — synthetic patient data">
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients or patient ID"
            className="w-full rounded-md border border-line bg-surface pl-9 pr-3 py-2 text-sm placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/patients/${p.id}`}
              className="bg-surface border border-line rounded-lg p-5 shadow-card hover:border-brand-500 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs text-ink-500">{p.id}</span>
                {p.mrn && <span className="font-mono text-[11px] text-ink-300">{p.mrn}</span>}
              </div>
              <h3 className="text-sm font-semibold text-ink-900">{p.name}</h3>
              <p className="text-xs text-ink-500 mt-1">
                Age {p.age}{p.sex ? ` · ${p.sex}` : ''}
              </p>
              {p.notes && <p className="text-xs text-ink-500 mt-3 line-clamp-2">{p.notes}</p>}
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
