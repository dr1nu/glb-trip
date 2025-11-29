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
      className="bg-white border border-orange-100 rounded-2xl p-6 space-y-6 max-w-md mx-auto"
    >
      <header>
        <h1 className="text-xl font-semibold">Admin login</h1>
        <p className="text-sm text-[#4C5A6B] mt-1">
          Enter the admin password to view saved trips.
        </p>
      </header>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[#4C5A6B]" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="w-full bg-gradient-to-b from-[#FFF4EB] via-white to-[#FFF9F4] border border-orange-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <div className="text-sm text-red-400 border border-red-500/40 bg-red-500/10 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        className={`w-full text-sm font-semibold py-3 rounded-xl transition-colors ${
          isSubmitting
            ? 'bg-orange-50 text-[#4C5A6B] cursor-not-allowed'
            : 'bg-orange-500 hover:bg-orange-600 text-neutral-900'
        }`}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
