'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export default function TemplateList({ templates }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  if (!templates?.length) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-sm text-neutral-300 text-center">
        No templates yet. Create one to speed up future trips.
      </div>
    );
  }

  async function handleDelete(template) {
    if (!template?.id || deletingId) return;
    const confirmed = window.confirm(`Delete template “${template.name}”?`);
    if (!confirmed) return;
    setError('');
    setDeletingId(template.id);
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof data?.error === 'string'
            ? data.error
            : `Failed with status ${response.status}.`;
        throw new Error(message);
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error('Failed to delete template', err);
      setError(err instanceof Error ? err.message : 'Unable to delete template.');
    } finally {
      setDeletingId('');
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-xl px-3 py-2">
          {error}
        </div>
      ) : null}

      {templates.map((template) => (
        <article
          key={template.id}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">{template.name}</h3>
              <p className="text-sm text-neutral-400">
                {template.destinationCountry} ·{' '}
                {template.tripLengthDays
                  ? `${template.tripLengthDays} day${template.tripLengthDays === 1 ? '' : 's'}`
                  : 'Length not set'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/admin/templates/${template.id}`}
                className="text-sm font-medium text-orange-300 hover:text-orange-200"
              >
                Open builder →
              </a>
              <button
                type="button"
                onClick={() => handleDelete(template)}
                disabled={deletingId === template.id || isPending}
                className={`text-sm font-medium rounded-lg border px-3 py-1 transition-colors ${
                  deletingId === template.id || isPending
                    ? 'border-red-800 text-red-400 cursor-not-allowed'
                    : 'border-red-700 text-red-300 hover:border-red-500 hover:text-red-200'
                }`}
              >
                {deletingId === template.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <Fact label="Cards" value={template.itinerary?.cards?.length ?? 0} />
            <Fact label="Source trip" value={template.sourceTripId || '—'} />
            <Fact
              label="Updated"
              value={
                template.updatedAt
                  ? new Date(template.updatedAt).toLocaleString('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'unknown'
              }
            />
          </dl>
          {template.notes ? (
            <p className="text-sm text-neutral-300">{template.notes}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3">
      <dt className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="text-sm font-medium text-neutral-100 mt-1">
        {value ?? '—'}
      </dd>
    </div>
  );
}
