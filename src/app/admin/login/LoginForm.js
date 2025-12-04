'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error ?? 'Login failed.');
      }

      router.replace('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
      setIsSubmitting(false);
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
          Enter the admin password to view saved trips.
        </p>
      </header>

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
      </div>

      {error && (
        <div className="text-sm text-red-300 border border-red-500/40 bg-red-500/10 rounded-xl px-3 py-2">
          {error}
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
