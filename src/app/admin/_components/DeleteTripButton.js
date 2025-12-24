'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteTripButton({ tripId, className = '' }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    const confirmed = window.confirm(
      'Delete this trip? This action cannot be undone.'
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.error || 'Unable to delete trip.';
        throw new Error(message);
      }
      router.refresh();
    } catch (err) {
      console.error('Failed to delete trip', err);
      window.alert(err instanceof Error ? err.message : 'Unable to delete trip.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className={`text-sm font-medium text-rose-300 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {isDeleting ? 'Deleting…' : 'Delete trip'}
    </button>
  );
}
