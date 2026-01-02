'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UnlockFreeButton({
  tripId,
  label = 'Unlock for free',
  className = '',
  redirectHref = '',
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async () => {
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/unlock-free`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Unable to unlock.');
      }
      if (redirectHref) {
        router.push(redirectHref);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to unlock.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleUnlock}
        disabled={isLoading}
        className={`inline-flex items-center justify-center rounded-xl bg-[#ff8a00] px-4 py-2 text-sm font-semibold text-white shadow shadow-[#ff8a00]/30 transition hover:bg-[#ff7a00] disabled:opacity-70 ${className}`}
      >
        {isLoading ? 'Unlocking…' : label}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
