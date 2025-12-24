'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      try {
        const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace('#', '?'));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            const { data, error: setErrorResp } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (setErrorResp) throw setErrorResp;
            if (!cancelled) {
              setReady(true);
              setEmail(data?.session?.user?.email ?? '');
            }
            return;
          }
        }

        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;
        if (!cancelled) {
          setReady(Boolean(session));
          setEmail(session?.user?.email ?? '');
        }
      } catch (err) {
        console.error('Failed to bootstrap reset session', err);
        if (!cancelled) {
          setError('Your reset link is invalid or expired. Please request a new one.');
        }
      }
    }

    bootstrapSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
        setEmail(session?.user?.email ?? '');
      }
    });

    return () => {
      cancelled = true;
      subscription?.subscription?.unsubscribe?.();
    };
  }, [supabase]);

  async function handleUpdate(event) {
    event.preventDefault();
    if (!ready || isUpdating) return;
    if (!password || password.length < 8) {
      setError('Password should be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setIsUpdating(true);
    setError('');
    setMessage('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setMessage('Password updated. Redirecting…');
      setTimeout(() => {
        router.replace('/');
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#eaf3ff] via-white to-[#fffaf5] text-[#0F172A] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-[#d8deed] bg-white/90 p-6 shadow-lg shadow-[#0c2a52]/5">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-[#4C5A6B]">
            Reset password
          </p>
          <h1 className="text-xl font-semibold">Choose a new password</h1>
          <p className="text-sm text-[#4C5A6B]">
            {ready
              ? 'Enter and confirm your new password to finish resetting your account.'
              : 'Verifying your reset link…'}
          </p>
        </header>

        {email ? (
          <div className="text-xs font-medium text-[#0c2a52] bg-[#eef2fb] border border-[#d8deed] rounded-xl px-3 py-2">
            {email}
          </div>
        ) : null}

        {error ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {message}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleUpdate}>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">New password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm transition bg-white border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 shadow-sm focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400 focus:outline-none"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={!ready || isUpdating}
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Confirm new password</span>
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm transition bg-white border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 shadow-sm focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400 focus:outline-none"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={!ready || isUpdating}
              required
            />
          </label>

          <button
            type="submit"
            disabled={!ready || isUpdating}
            className={`w-full font-semibold text-sm py-3 rounded-xl transition-colors ${
              !ready || isUpdating
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                : 'bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-200/70'
            }`}
          >
            {isUpdating ? 'Saving…' : 'Update password'}
          </button>
        </form>

        <p className="text-xs text-[#4C5A6B]">
          Stuck? Request a fresh link from the sign-in screen and make sure you open it on this device.
        </p>
      </div>
    </main>
  );
}
