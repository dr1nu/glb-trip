'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateItineraryButton({ tripId, hasItinerary, cardCount }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const disabled = isPending;

  function handleCreate() {
    setError('');
    if (hasItinerary) {
      router.push(`/trip/${tripId}/builder?from=admin`);
      return;
    }
    if (disabled) return;
    startTransition(async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}`, {
          method: 'POST',
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            typeof data?.error === 'string'
              ? data.error
              : `Failed with status ${response.status}.`;
          throw new Error(message);
        }
        router.push(`/trip/${tripId}/builder?from=admin`);
      } catch (err) {
        console.error('Failed to create itinerary', err);
        setError(
          err instanceof Error ? err.message : 'Unable to create itinerary.'
        );
      }
    });
  }

  return (
    <div className="bg-[#f0f4ff] border border-[#dfe7ff] rounded-2xl p-5 space-y-3 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Trip builder</h2>
          <p className="text-sm text-[#4C5A6B]">
            Generate the core itinerary cards before adding details.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={disabled}
          className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            disabled
              ? 'bg-[#ffd9b3] text-[#9a5b00] cursor-not-allowed'
              : 'bg-[#ff8a00] hover:bg-[#ff7a00] text-white shadow shadow-[#ff8a00]/30'
          }`}
        >
          {hasItinerary
            ? `Open trip builder (${cardCount} card${cardCount === 1 ? '' : 's'})`
            : isPending
            ? 'Creating…'
            : 'Create trip'}
        </button>
      </div>
      {error ? (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          {error}
        </div>
      ) : null}
    </div>
  );
}
