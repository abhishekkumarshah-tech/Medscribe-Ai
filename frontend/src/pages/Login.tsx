import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import medscribeLogo from '../assets/Medscribe-logo.jpeg';
import ErrorNotice from '../components/ErrorNotice';
import { useAuth } from '../lib/auth';
import { getErrorMessage } from '../lib/api';

type FormMode = 'login' | 'register';

export default function Login() {
  const { doctor, loading: authLoading, login, register, authConfig, logoutWarning } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<FormMode>('login');
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('General Medicine');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && doctor) navigate('/dashboard', { replace: true });
  }, [authLoading, doctor, navigate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(name.trim(), email.trim(), password, specialty.trim());
      } else {
        await login(email.trim(), password);
      }
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err, mode === 'register' ? 'Account creation failed.' : 'Sign in failed.'));
    } finally {
      setLoading(false);
    }
  }

  async function useDemo() {
    setError('');
    setLoading(true);
    try {
      await login('doctor@carenote.demo', 'demo123');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Demo sign in failed.'));
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode: FormMode) {
    setMode(nextMode);
    setError('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <img src={medscribeLogo} alt="" className="h-9 w-9 rounded-md object-contain" />
          <span className="text-lg font-semibold text-ink-900 tracking-tight">Medscribe AI</span>
        </div>

        <div className="bg-surface border border-line rounded-lg shadow-card p-6 sm:p-8">
          <h1 className="text-[15px] font-semibold text-ink-900 mb-1">
            {mode === 'register' ? 'Create your workspace account' : 'Sign in to your workspace'}
          </h1>
          <p className="text-sm text-ink-500 mb-6">
            AI-assisted clinical documentation with clinician review and human oversight.
          </p>

          {logoutWarning && <ErrorNotice message={logoutWarning} className="mb-4" />}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="doctor-name" className="block text-xs font-medium text-ink-700 mb-1.5">Name</label>
                  <input
                    id="doctor-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={200}
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="doctor-specialty" className="block text-xs font-medium text-ink-700 mb-1.5">Specialty</label>
                  <input
                    id="doctor-specialty"
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    value={specialty}
                    onChange={(event) => setSpecialty(event.target.value)}
                    className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
              </>
            )}
            <div>
              <label htmlFor="doctor-email" className="block text-xs font-medium text-ink-700 mb-1.5">Email</label>
              <input
                id="doctor-email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="doctor@example.com"
                className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="doctor-password" className="block text-xs font-medium text-ink-700 mb-1.5">Password</label>
              <input
                id="doctor-password"
                type="password"
                required
                minLength={mode === 'register' ? 12 : 1}
                maxLength={128}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'register' ? 'At least 12 characters' : 'Your password'}
                className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              {mode === 'register' && <p className="mt-1 text-[11px] text-ink-500">Use at least 12 characters.</p>}
            </div>

            {error && <ErrorNotice message={error} />}

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full rounded-md bg-brand-700 text-white text-sm font-medium py-2.5 hover:bg-brand-900 transition-colors disabled:opacity-60"
            >
              {loading ? (mode === 'register' ? 'Creating account…' : 'Signing in…') : (mode === 'register' ? 'Create account' : 'Sign in')}
            </button>
          </form>

          {authConfig.allow_signup && (
            <p className="mt-4 text-center text-xs text-ink-500">
              {mode === 'login' ? 'New to Medscribe?' : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}
                className="font-medium text-brand-700 hover:text-brand-900 underline underline-offset-2"
              >
                {mode === 'login' ? 'Create an account' : 'Sign in'}
              </button>
            </p>
          )}

          {authConfig.demo_login_enabled && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px bg-line flex-1" />
                <span className="text-xs text-ink-300">or</span>
                <div className="h-px bg-line flex-1" />
              </div>
              <button
                type="button"
                onClick={useDemo}
                disabled={loading || authLoading}
                className="w-full rounded-md border border-line text-sm font-medium py-2.5 text-ink-700 hover:bg-surface-muted transition-colors disabled:opacity-60"
              >
                Use local demo account
              </button>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-5 text-xs text-ink-500">
          <ShieldCheck size={13} strokeWidth={1.8} aria-hidden="true" />
          Demo only — do not enter real patient information
        </div>
      </div>
    </div>
  );
}
