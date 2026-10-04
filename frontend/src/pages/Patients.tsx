import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import Layout from '../components/Layout';
import ErrorNotice from '../components/ErrorNotice';
import { api, getErrorMessage } from '../lib/api';
import type { Patient } from '../types';

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let active = true;
    api.listPatients()
      .then((result) => { if (active) setPatients(result); })
      .catch((err: unknown) => { if (active) setError(getErrorMessage(err, 'Could not load patients.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = patients.filter((patient) =>
    patient.name.toLowerCase().includes(normalizedQuery) || patient.id.toLowerCase().includes(normalizedQuery),
  );

  async function createPatient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const patient = await api.createPatient({
        name: name.trim(),
        age: Number(age),
        ...(sex.trim() ? { sex: sex.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setPatients((current) => [patient, ...current]);
      setName('');
      setAge('');
      setSex('');
      setNotes('');
      setShowCreateForm(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not create patient.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Patients" subtitle="Private patient list — use synthetic data only in this demo">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" aria-hidden="true" />
          <label htmlFor="patient-search" className="sr-only">Search patients</label>
          <input
            id="patient-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search patients or patient ID"
            className="w-full rounded-md border border-line bg-surface pl-9 pr-3 py-2 text-sm placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <button
          type="button"
          onClick={() => { setShowCreateForm((shown) => !shown); setError(''); }}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-brand-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-900 transition-colors sm:w-auto"
        >
          {showCreateForm ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          {showCreateForm ? 'Cancel' : 'Add patient'}
        </button>
      </div>

      {error && <ErrorNotice message={error} className="mb-4" />}

      {showCreateForm && (
        <form onSubmit={createPatient} className="mb-5 max-w-2xl space-y-4 rounded-lg border border-line bg-surface p-5 shadow-card">
          <h2 className="text-sm font-semibold text-ink-900">New patient</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="patient-name" className="mb-1.5 block text-xs font-medium text-ink-700">Name</label>
              <input
                id="patient-name"
                type="text"
                required
                minLength={2}
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label htmlFor="patient-age" className="mb-1.5 block text-xs font-medium text-ink-700">Age</label>
              <input
                id="patient-age"
                type="number"
                required
                min={0}
                max={130}
                step={1}
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label htmlFor="patient-sex" className="mb-1.5 block text-xs font-medium text-ink-700">Sex (optional)</label>
              <input
                id="patient-sex"
                type="text"
                maxLength={64}
                value={sex}
                onChange={(event) => setSex(event.target.value)}
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label htmlFor="patient-notes" className="mb-1.5 block text-xs font-medium text-ink-700">Notes (optional)</label>
              <input
                id="patient-notes"
                type="text"
                maxLength={4000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save patient'}
          </button>
        </form>
      )}

      {loading ? (
        <p role="status" className="text-sm text-ink-500">Loading patients…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface p-5 text-sm text-ink-500">
          {patients.length === 0 ? 'No patients yet. Add a patient to start a consultation.' : 'No patients match your search.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((patient) => (
            <Link
              key={patient.id}
              to={`/patients/${patient.id}`}
              className="rounded-lg border border-line bg-surface p-5 shadow-card transition-colors hover:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-ink-500">{patient.id}</span>
                {patient.mrn && <span className="truncate font-mono text-[11px] text-ink-300">{patient.mrn}</span>}
              </div>
              <h3 className="text-sm font-semibold text-ink-900">{patient.name}</h3>
              <p className="mt-1 text-xs text-ink-500">Age {patient.age}{patient.sex ? ` · ${patient.sex}` : ''}</p>
              {patient.notes && <p className="mt-3 line-clamp-2 text-xs text-ink-500">{patient.notes}</p>}
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
