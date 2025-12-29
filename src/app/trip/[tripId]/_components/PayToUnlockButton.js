'use client';

import { useState } from 'react';

export default function PayToUnlockButton({ tripId, label = 'Pay to unlock itinerary' }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/checkout/trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Unable to start checkout.');
      }
      const payload = await response.json();
      if (!payload?.url) {
        throw new Error('Checkout URL missing.');
      }
      window.location.assign(payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handlePay}
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff8a00] px-4 py-2 text-sm font-semibold text-white shadow shadow-[#ff8a00]/30 transition hover:bg-[#ff7a00] disabled:opacity-70"
      >
        {isLoading ? 'Redirecting…' : label}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
