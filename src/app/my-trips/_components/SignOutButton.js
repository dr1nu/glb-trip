'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    if (loading) return;
    setLoading(true);
    await supabase.auth.signOut();
    router.replace('/');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
        loading
          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-neutral-400'
          : 'border-orange-100 bg-white text-orange-600 hover:bg-orange-50'
      }`}
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
