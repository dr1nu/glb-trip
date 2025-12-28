'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const BUCKET = 'trip-country-images';

function buildPath(country, name) {
  if (!country || !name) return '';
  return `${country}/${name}`;
}

export default function TripImagePicker({ tripId, destinationCountry, initialImagePath }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [options, setOptions] = useState([]);
  const [selectedPath, setSelectedPath] = useState(initialImagePath ?? '');
  const [countryFolder, setCountryFolder] = useState(destinationCountry ?? '');
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    async function loadImages() {
      if (!destinationCountry) {
        setOptions([]);
        setCountryFolder('');
        return;
      }
      setLoadingList(true);
      setFeedback('');
      try {
        const listFolder = async (folder) => {
          const { data, error } = await supabase.storage
            .from(BUCKET)
            .list(folder, { limit: 100, sortBy: { column: 'name', order: 'asc' } });
          if (error) throw error;
          return data ?? [];
        };

        let folder = destinationCountry;
        let data = await listFolder(folder);
        let paths = data
          .filter((file) => file && file.name && !file.name.endsWith('/'))
          .map((file) => buildPath(folder, file.name));

        if (paths.length === 0) {
          const { data: root, error: rootError } = await supabase.storage
            .from(BUCKET)
            .list('', { limit: 200, sortBy: { column: 'name', order: 'asc' } });
          if (rootError) throw rootError;
          const match = (root ?? []).find((entry) => {
            if (!entry?.name) return false;
            return entry.name.toLowerCase() === destinationCountry.toLowerCase();
          });
          if (match?.name) {
            folder = match.name;
            data = await listFolder(folder);
            paths = data
              .filter((file) => file && file.name && !file.name.endsWith('/'))
              .map((file) => buildPath(folder, file.name));
          }
        }

        setCountryFolder(folder);
        setOptions(paths);
        setSelectedPath((prev) => {
          if (paths.length === 0) return '';
          if (prev && paths.includes(prev)) return prev;
          return paths[0] ?? '';
        });
      } catch (err) {
        console.error('Failed to load country images', err);
        setFeedback('Unable to load images for this country.');
      } finally {
        setLoadingList(false);
      }
    }
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationCountry]);

  async function handleSave() {
    if (!tripId) {
      setFeedback('Trip ID missing; cannot save selection.');
      return;
    }
    if (!selectedPath) {
      setFeedback('Select an image before saving.');
      return;
    }
    if (saving) return;
    setSaving(true);
    setFeedback('');
    try {
      const response = await fetch(`/api/trips/${tripId}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePath: selectedPath || null, tripId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof data?.error === 'string' ? data.error : `Failed with status ${response.status}.`;
        throw new Error(message);
      }
      setSelectedPath(data?.imagePath ?? '');
      setFeedback('Trip image saved.');
    } catch (err) {
      console.error('Failed to save image path', err);
      setFeedback(err instanceof Error ? err.message : 'Could not save image.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file) {
    const folder = countryFolder || destinationCountry || '';
    if (!file || uploading || !folder) return;
    setUploading(true);
    setFeedback('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('country', folder);
      const response = await fetch(`/api/trips/${tripId}/image`, {
        method: 'PUT',
        body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof data?.error === 'string' ? data.error : `Upload failed (${response.status}).`;
        throw new Error(message);
      }
      const uploadedPath = data?.imagePath ?? '';
      setSelectedPath(uploadedPath);
      setFeedback('Uploaded and applied to trip.');
      // refresh list to include new file
      const { data: refreshed } = await supabase.storage
        .from(BUCKET)
        .list(folder, { limit: 100, sortBy: { column: 'name', order: 'asc' } });
      const paths = (refreshed ?? [])
        .filter((fileEntry) => fileEntry && fileEntry.name && !fileEntry.name.endsWith('/'))
        .map((fileEntry) => buildPath(folder, fileEntry.name));
      setOptions(paths);
    } catch (err) {
      console.error('Upload failed', err);
      setFeedback(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#ffd9b3] bg-white p-4 shadow-sm shadow-[#ff8a00]/10 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Trip image</p>
          <p className="text-xs text-[#4C5A6B]">
            Select an image from the {destinationCountry || '—'} folder or upload a new one.
          </p>
        </div>
        {selectedPath ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Saved
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex-1 text-sm text-neutral-700">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#4C5A6B]">
            Country images
          </span>
          <select
            className="w-full rounded-lg border border-[#ffd9b3] bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none focus:border-[#ff8a00] focus:ring-2 focus:ring-[#ffe7cc]"
            value={selectedPath}
            onChange={(e) => setSelectedPath(e.target.value)}
            disabled={loadingList || !destinationCountry}
          >
            {!destinationCountry ? (
              <option value="">Set a destination country first</option>
            ) : options.length === 0 ? (
              <option value="">No images in this folder</option>
            ) : (
              options.map((path) => (
                <option key={path} value={path}>
                  {path.split('/').pop()}
                </option>
              ))
            )}
          </select>
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !destinationCountry}
          className="whitespace-nowrap rounded-lg bg-[#ff8a00] px-4 py-2 text-sm font-semibold text-white shadow shadow-[#ff8a00]/30 transition hover:bg-[#ff7a00] disabled:cursor-not-allowed disabled:bg-[#ffd9b3] disabled:text-[#9a5b00]"
        >
          {saving ? 'Saving…' : 'Save selection'}
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-[#ffd9b3] bg-[#fff7ef] px-3 py-3 text-xs text-[#4C5A6B] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-neutral-800">Need a new image?</p>
          <p>Upload to this country folder and apply automatically.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#0f4cd6] shadow-sm shadow-[#0f4cd6]/10 transition hover:text-[#0c3fb2]">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleUpload(file);
                e.target.value = '';
              }
            }}
            disabled={uploading || !destinationCountry}
          />
          {uploading ? 'Uploading…' : 'Upload image'}
        </label>
      </div>

      {feedback ? <p className="text-xs text-[#0f4cd6]">{feedback}</p> : null}
    </div>
  );
}
