'use client';

import { useMemo, useState } from 'react';

function formatEuroCents(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  const rounded = Math.round(value);
  if (rounded % 100 === 0) return `€${rounded / 100}`;
  return `€${(rounded / 100).toFixed(2)}`;
}

function parseEuroInput(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(',', '.');
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return NaN;
  return Math.round(parsed * 100);
}

export default function AdminBillingEditor({
  tripId,
  tripLengthDays,
  billingAmountCents,
  billingCustomAmountCents,
  billingCurrency = 'EUR',
}) {
  const defaultAmountCents = useMemo(() => {
    if (typeof billingAmountCents === 'number') return billingAmountCents;
    const days = Number.isFinite(tripLengthDays) ? tripLengthDays : 0;
    return Math.max(0, Math.round(days * 300));
  }, [billingAmountCents, tripLengthDays]);
  const [value, setValue] = useState(
    typeof billingCustomAmountCents === 'number'
      ? (billingCustomAmountCents / 100).toFixed(2)
      : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const currencyLabel = billingCurrency && billingCurrency !== 'EUR'
    ? `(${billingCurrency})`
    : '';

  const handleSave = async () => {
    setError('');
    setFeedback('');
    const parsed = parseEuroInput(value);
    if (Number.isNaN(parsed)) {
      setError('Enter a valid amount like 12 or 12.50.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingCustomAmountCents: parsed === null ? null : parsed,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Unable to update pricing.');
      }
      setFeedback('Saved custom amount.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update pricing.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setError('');
    setFeedback('');
    setIsSaving(true);
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingCustomAmountCents: null }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Unable to reset pricing.');
      }
      setValue('');
      setFeedback('Custom amount cleared.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset pricing.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#ffd9b3] bg-white/90 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">Billing amount</p>
        <p className="text-xs text-[#4C5A6B]">
          Default: {formatEuroCents(defaultAmountCents)} {currencyLabel}
        </p>
      </div>
      <label className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#0c2a52]">
          Custom amount (EUR)
        </span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="e.g. 18 or 18.50"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full rounded-xl border border-[#d8deed] bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ff8a00]/40"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center rounded-xl bg-[#0c2a52] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-[#0c2a52]/20 transition hover:bg-[#0a2344] disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save amount'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isSaving}
          className="inline-flex items-center justify-center rounded-xl border border-[#d8deed] bg-white px-4 py-2 text-sm font-semibold text-[#4C5A6B] shadow-sm hover:text-[#0c2a52] disabled:opacity-60"
        >
          Use default
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {feedback ? <p className="text-xs text-emerald-700">{feedback}</p> : null}
    </div>
  );
}
