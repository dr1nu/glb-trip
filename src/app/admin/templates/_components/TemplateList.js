'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Copy, FileText, MapPin, Pencil, Trash2 } from 'lucide-react';

export default function TemplateList({ templates }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState('');
  const [copyingId, setCopyingId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [draftName, setDraftName] = useState('');
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  if (!templates?.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
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

  async function handleCopy(template) {
    if (!template?.id || copyingId) return;
    setError('');
    setCopyingId(template.id);
    try {
      const response = await fetch(`/api/templates/${template.id}`);
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof data?.error === 'string'
            ? data.error
            : `Failed with status ${response.status}.`;
        throw new Error(message);
      }

      const source = data?.template;
      const payload = {
        name: `${source?.name || 'Template'} (Copy)`,
        destinationCountry: source?.destinationCountry || '',
        tripLengthDays: source?.tripLengthDays || null,
        notes: source?.notes || undefined,
        itinerary: source?.itinerary || undefined,
      };

      const createResponse = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const created = await createResponse.json().catch(() => null);
      if (!createResponse.ok) {
        const message =
          typeof created?.error === 'string'
            ? created.error
            : `Failed with status ${createResponse.status}.`;
        throw new Error(message);
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error('Failed to copy template', err);
      setError(err instanceof Error ? err.message : 'Unable to copy template.');
    } finally {
      setCopyingId('');
    }
  }

  async function handleSaveName(template) {
    if (!template?.id || savingId) return;
    const trimmed = draftName.trim();
    if (!trimmed) {
      setError('Template name cannot be empty.');
      return;
    }
    setError('');
    setSavingId(template.id);
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof data?.error === 'string'
            ? data.error
            : `Failed with status ${response.status}.`;
        throw new Error(message);
      }
      setEditingId('');
      setDraftName('');
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error('Failed to rename template', err);
      setError(err instanceof Error ? err.message : 'Unable to rename template.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {templates.map((template) => (
        <article
          key={template.id}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                {editingId === template.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      className="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveName(template)}
                      disabled={savingId === template.id}
                      className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-200"
                    >
                      {savingId === template.id ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId('');
                        setDraftName('');
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <h3 className="text-lg font-semibold text-slate-900">
                    {template.name}
                  </h3>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>
                      {template.tripLengthDays
                        ? `${template.tripLengthDays} day${
                            template.tripLengthDays === 1 ? '' : 's'
                          }`
                        : 'Length not set'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    <span>{template.destinationCountry || 'Destination TBC'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/admin/templates/${template.id}`}
                className="inline-flex items-center justify-center rounded-xl border border-orange-300 px-3 py-2 text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
              >
                Open builder
              </a>
              <button
                type="button"
                onClick={() => {
                  setEditingId(template.id);
                  setDraftName(template.name || '');
                }}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                aria-label="Edit template name"
                title="Edit template name"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleCopy(template)}
                disabled={copyingId === template.id}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                aria-label="Copy template"
                title="Copy template"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(template)}
                disabled={deletingId === template.id || isPending}
                className={`text-sm font-semibold rounded-xl border px-3 py-2 transition-colors ${
                  deletingId === template.id || isPending
                    ? 'border-red-200 text-red-300 cursor-not-allowed'
                    : 'border-red-200 text-red-500 hover:bg-red-50'
                }`}
                aria-label="Delete template"
                title="Delete template"
              >
                {deletingId === template.id ? (
                  'Deleting…'
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
