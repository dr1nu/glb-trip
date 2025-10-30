'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    if (isLoading) return;
    setIsLoading(true);

    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      router.replace('/admin/login');
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`text-sm font-medium px-3 py-2 rounded-lg border ${
        isLoading
          ? 'border-neutral-700 text-neutral-500 cursor-not-allowed'
          : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
      }`}
      disabled={isLoading}
    >
      {isLoading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
