'use client';

import { useRef, useState } from 'react';

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

export default function TemplateImporter() {
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSelectFile = () => {
    if (importing) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setSuccess('');
    setImporting(true);

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) {
        throw new Error('CSV is empty or unreadable.');
      }

      const name =
        window.prompt('Template name', file.name.replace(/\.[^.]+$/, '') || 'New template') ||
        '';
      if (!name.trim()) {
        throw new Error('Template name is required.');
      }
      const destination =
        window.prompt('Destination country', '') || '';
      if (!destination.trim()) {
        throw new Error('Destination is required.');
      }
      const tripLengthInput = window.prompt('Trip length (days, optional)', '');
      const tripLength = toNumber(tripLengthInput);
      const notes = window.prompt('Optional notes', '') || undefined;

      const dayGroups = new Map();
      const unassignedActivities = [];
      rows.forEach((row) => {
        const day = toNumber(row.day);
        const itemTypeRaw = (row.type || row.category || 'attraction')
          .toString()
          .trim()
          .toLowerCase();
        const title = row.title || row.activity || row.place || '';
        const timelineItem = {
          type: itemTypeRaw || 'attraction',
          fields: {
            title,
            name: title,
            time: row.time || '',
            duration: row.duration || '',
            travelMode: row['travel connector'] || '',
            travelDuration: row['travel time'] || '',
            price: row.price || '',
            link: row.link || '',
            description: row.description || row.notes || '',
          },
        };
        if (!day) {
          unassignedActivities.push(timelineItem);
          return;
        }
        dayGroups.set(day, [...(dayGroups.get(day) || []), timelineItem]);
      });

      const sortedDays = Array.from(dayGroups.keys()).sort((a, b) => a - b);
      if (!sortedDays.length && unassignedActivities.length === 0) {
        throw new Error('No rows with a valid "day" column were found.');
      }

      const dayCards = sortedDays.map((day) => {
        const timeline = dayGroups.get(day) || [];
        return {
          id: `day-${day}`,
          type: 'day',
          title: `Day ${day}`,
          subtitle: destination,
          priceLabel: '',
          summary: '',
          fields: {
            city: destination,
            highlightAttraction: timeline[0]?.fields?.title || '',
            dailyCost: '',
          },
          timeline,
          notes: '',
        };
      });

      const payload = {
        name: name.trim(),
        destinationCountry: destination.trim(),
        tripLengthDays: tripLength || dayCards.length || 1,
        itinerary: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cards: dayCards,
          unassignedActivities,
        },
        notes,
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
            : `Import failed with status ${response.status}.`;
        throw new Error(message);
      }

      setSuccess('Template imported.');
    } catch (err) {
      console.error('Failed to import template', err);
      setError(err instanceof Error ? err.message : 'Unable to import template.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleSelectFile}
        disabled={importing}
        className={`text-sm font-medium rounded-lg border px-3 py-1 transition-colors ${
          importing
            ? 'border-orange-800 text-orange-500 cursor-not-allowed'
            : 'border-orange-600 text-orange-300 hover:border-orange-400 hover:text-orange-200'
        }`}
        title="Import templates from CSV"
      >
        {importing ? 'Importing…' : 'Import CSV'}
      </button>
      {error ? (
        <span className="text-[11px] text-red-300">{error}</span>
      ) : success ? (
        <span className="text-[11px] text-green-300">{success}</span>
      ) : null}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
