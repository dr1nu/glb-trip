'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

function parseCsv(text) {
  const rows = [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return rows;
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export default function TemplateCreator({ trips = [] }) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [name, setName] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [tripLengthDays, setTripLengthDays] = useState('');
  const [notes, setNotes] = useState('');
  const [sourceTripId, setSourceTripId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [createdTemplateId, setCreatedTemplateId] = useState('');
  const [isPending, startTransition] = useTransition();
  const [importing, setImporting] = useState(false);

  const tripOptions = useMemo(
    () =>
      trips.map((trip) => ({
        id: trip.id,
        label: `${trip.destinationCountry} (${trip.tripLengthDays}d)`,
        destinationCountry: trip.destinationCountry,
        tripLengthDays: trip.tripLengthDays,
      })),
    [trips]
  );

  function handleTripSelect(nextId) {
    setSourceTripId(nextId);
    if (!nextId) return;
    const match = tripOptions.find((t) => t.id === nextId);
    if (match) {
      setDestinationCountry((prev) => prev || match.destinationCountry || '');
      setTripLengthDays((prev) => prev || String(match.tripLengthDays || ''));
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    setCreatedTemplateId('');

    startTransition(async () => {
      try {
        const payload = {
          name,
          destinationCountry,
          notes: notes || undefined,
          sourceTripId: sourceTripId || undefined,
        };
        const parsedLength = Number(tripLengthDays);
        if (Number.isFinite(parsedLength) && parsedLength > 0) {
          payload.tripLengthDays = Math.round(parsedLength);
        }

        const response = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            typeof data?.error === 'string'
              ? data.error
              : `Failed with status ${response.status}.`;
          throw new Error(message);
        }

        const templateId = data?.template?.id;
        setName('');
        setNotes('');
        setTripLengthDays('');
        setSourceTripId('');
        setCreatedTemplateId(templateId || '');
        setMessage({
          type: 'success',
          text: 'Template created. You can refine it in the builder.',
        });
        router.refresh();
      } catch (err) {
        console.error('Failed to create template', err);
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Unable to create template.',
        });
      }
    });
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Create a template</h2>
        <p className="text-sm text-neutral-400">
          Start from a past trip or a blank scaffold for this destination.
        </p>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-neutral-300">Template name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Paris long-weekend"
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500"
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-neutral-300">Destination</span>
            <input
              type="text"
              value={destinationCountry}
              onChange={(e) => setDestinationCountry(e.target.value)}
              placeholder="France"
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500"
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-neutral-300">Trip length (days)</span>
            <input
              type="number"
              min="1"
              value={tripLengthDays}
              onChange={(e) => setTripLengthDays(e.target.value)}
              placeholder="5"
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-neutral-300">Optional notes</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Family-friendly, summer picks…"
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500"
            />
          </label>
        </div>

        <label className="space-y-1 text-sm block">
          <span className="text-neutral-300">Start from a past trip</span>
          <select
            value={sourceTripId}
            onChange={(e) => handleTripSelect(e.target.value)}
            className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm text-neutral-50"
          >
            <option value="">No base trip</option>
            {tripOptions.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-500">
            If selected, the itinerary from that trip will be copied into the template.
          </p>
        </label>

        <div className="flex flex-wrap items-center gap-3 justify-between">
          <p className="text-xs text-neutral-500">
            Templates can be refined later in the builder.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              isPending
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-400 text-neutral-900'
            }`}
          >
            {isPending ? 'Creating…' : 'Create template'}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-3 justify-between border-t border-neutral-800 pt-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-neutral-200">Or import from CSV</p>
          <p className="text-xs text-neutral-500">
            Uses the name/destination above; CSV rows should include day, time, duration, title, type, price, description, link.
          </p>
          {importing ? (
            <p className="text-xs text-neutral-400">Importing…</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isPending || importing) return;
              if (!name.trim() || !destinationCountry.trim()) {
                setMessage({
                  type: 'error',
                  text: 'Enter name and destination before importing.',
                });
                return;
              }
              fileInputRef.current?.click();
            }}
            disabled={isPending || importing}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors border ${
              isPending || importing
                ? 'bg-neutral-900 text-neutral-500 border-neutral-800 cursor-not-allowed'
                : 'bg-neutral-900 text-orange-300 border-orange-400 hover:border-orange-300'
            }`}
          >
            {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              setMessage({ type: '', text: '' });
              setCreatedTemplateId('');
              setImporting(true);
              try {
                const text = await file.text();
                const rows = parseCsv(text);
                if (!rows.length) {
                  throw new Error('CSV is empty or unreadable.');
                }

                const dayGroups = new Map();
                rows.forEach((row) => {
                  const day = toNumber(row.day);
                  if (!day) return;
                  const itemType = (row.type || row.category || 'attraction')
                    .toString()
                    .trim()
                    .toLowerCase();
                  const title = row.title || row.activity || row.place || '';
                  const timelineItem = {
                    type: itemType,
                    fields: {
                      title,
                      name: title,
                      time: row.time || '',
                      duration: row.duration || '',
                      price: row.price || '',
                      link: row.link || '',
                      description: row.description || row.notes || '',
                    },
                  };
                  dayGroups.set(day, [...(dayGroups.get(day) || []), timelineItem]);
                });

                const sortedDays = Array.from(dayGroups.keys()).sort((a, b) => a - b);
                if (!sortedDays.length) {
                  throw new Error('No rows with a valid "day" column were found.');
                }

                const dayCards = sortedDays.map((day) => {
                  const timeline = dayGroups.get(day) || [];
                  return {
                    id: `day-${day}`,
                    type: 'day',
                    title: `Day ${day}`,
                    subtitle: destinationCountry,
                    priceLabel: '',
                    summary: '',
                    fields: {
                      city: destinationCountry,
                      highlightAttraction: timeline[0]?.fields?.title || '',
                      dailyCost: '',
                    },
                    timeline,
                    notes: '',
                  };
                });

                const parsedLength = Number(tripLengthDays);
                const lengthFromInput =
                  Number.isFinite(parsedLength) && parsedLength > 0
                    ? Math.round(parsedLength)
                    : null;

                const payload = {
                  name: name.trim(),
                  destinationCountry: destinationCountry.trim(),
                  tripLengthDays: lengthFromInput || dayCards.length,
                  notes: notes || undefined,
                  itinerary: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    cards: dayCards,
                  },
                };

                const response = await fetch('/api/templates', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });

                const data = await response.json().catch(() => null);
                if (!response.ok) {
                  const message =
                    typeof data?.error === 'string'
                      ? data.error
                      : `Failed with status ${response.status}.`;
                  throw new Error(message);
                }

                const templateId = data?.template?.id;
                setCreatedTemplateId(templateId || '');
                setMessage({
                  type: 'success',
                  text: 'Template imported from CSV. You can refine it in the builder.',
                });
                startTransition(() => {
                  router.refresh();
                });
              } catch (err) {
                console.error('Failed to import template', err);
                setMessage({
                  type: 'error',
                  text: err instanceof Error ? err.message : 'Unable to import template.',
                });
              } finally {
                setImporting(false);
              }
            }}
          />
        </div>
      </div>

      {message.text ? (
        <div
          className={`text-sm rounded-xl px-3 py-2 border ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-200'
              : 'bg-red-500/10 border-red-500/30 text-red-200'
          }`}
        >
          {message.text}
          {message.type === 'success' && createdTemplateId ? (
            <a
              href={`/admin/templates/${createdTemplateId}`}
              className="ml-2 underline decoration-dotted"
            >
              Open builder →
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
