import medscribeLogo from '../assets/Medscribe-logo.jpeg';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  async function useDemo() {
    setEmail('doctor@carenote.demo');
    setPassword('demo123');
    setError('');
    setLoading(true);
    try {
      await login('doctor@carenote.demo', 'demo123');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <img
            src={medscribeLogo}
            alt="Medscribe AI"
            className="h-9 w-9 rounded-md object-contain"
          />
          <span className="text-lg font-semibold text-ink-900 tracking-tight">Medscribe AI</span>
        </div>

        <div className="bg-surface border border-line rounded-lg shadow-card p-8">
          <h1 className="text-[15px] font-semibold text-ink-900 mb-1">Sign in to your workspace</h1>
          <p className="text-sm text-ink-500 mb-6">AI-assisted clinical documentation, with privacy and human oversight.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@carenote.demo"
                className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-brand-700 text-white text-sm font-medium py-2.5 hover:bg-brand-900 transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-line flex-1" />
            <span className="text-xs text-ink-300">or</span>
            <div className="h-px bg-line flex-1" />
          </div>

          <button
            onClick={useDemo}
            disabled={loading}
            className="w-full rounded-md border border-line text-sm font-medium py-2.5 text-ink-700 hover:bg-surface-muted transition-colors disabled:opacity-60"
          >
            Use demo account
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-5 text-xs text-ink-300">
          <ShieldCheck size={13} strokeWidth={1.8} />
          Demo environment — synthetic patient data only
        </div>
      </div>
    </div>
  );
}
