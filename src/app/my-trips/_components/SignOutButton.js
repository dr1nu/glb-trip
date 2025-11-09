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
      className={`text-sm font-medium px-3 py-1.5 rounded-xl border ${
        loading
          ? 'border-neutral-800 text-neutral-500'
          : 'border-orange-500 text-orange-400 hover:bg-orange-500/10'
      }`}
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
