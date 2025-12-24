'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginForm() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
      const probe = await fetch('/api/admin/check', { cache: 'no-store' });
      if (probe.status === 403) {
        setError('Access forbidden: this account is not an admin.');
        await supabase.auth.signOut();
        return;
      }
      if (!probe.ok) {
        throw new Error('Login succeeded but admin check failed.');
      }
      router.replace('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReset() {
    if (isResetting || isSubmitting) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Enter your admin email first.');
      return;
    }
    setIsResetting(true);
    setError('');
    setMessage('');
    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/reset`
          : undefined;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo }
      );
      if (resetError) throw resetError;
      setMessage('If this email is registered, a reset link is on its way.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset link.');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 max-w-md mx-auto text-neutral-100"
    >
      <header>
        <h1 className="text-xl font-semibold">Admin login</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Sign in with your admin email and password.
        </p>
      </header>

      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-300" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-300" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-orange-300 hover:text-orange-200"
          disabled={isResetting || isSubmitting}
        >
          {isResetting ? 'Sending reset link…' : 'Forgot password?'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-300 border border-red-500/40 bg-red-500/10 rounded-xl px-3 py-2">
          {error}
        </div>
      )}
      {message && (
        <div className="text-sm text-emerald-300 border border-emerald-500/40 bg-emerald-500/10 rounded-xl px-3 py-2">
          {message}
        </div>
      )}

      <button
        type="submit"
        className={`w-full text-sm font-semibold py-3 rounded-xl transition-colors ${
          isSubmitting
            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            : 'bg-orange-500 hover:bg-orange-600 text-neutral-900'
        }`}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
