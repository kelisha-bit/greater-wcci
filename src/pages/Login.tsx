import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Church, Lock, Mail } from 'lucide-react';
import ErrorBoundary from '../components/ErrorBoundary';
import api from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.auth.login(email.trim(), password);
      if (!res.success || !res.data) {
        setError(res.error || 'Sign in failed');
        return;
      }
      if (!res.data.token) {
        setError(
          'No active session. Confirm your email in Supabase, or enable sign-in for this account.'
        );
        return;
      }
      navigate('/', { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-stone-200/80 bg-white/90 p-8 shadow-xl shadow-stone-200/50 backdrop-blur-xl"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
            <Church className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-800">ChurchApp</h1>
          <p className="mt-2 text-sm text-stone-600">
            Sign in with your Supabase account to load and manage data.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-stone-600">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-stone-800 outline-none ring-amber-500/30 focus:ring-2"
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-stone-600">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-stone-800 outline-none ring-amber-500/30 focus:ring-2"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-medium text-white shadow-lg shadow-amber-500/25 transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </motion.div>
    </div>
    </ErrorBoundary>
  );
}
