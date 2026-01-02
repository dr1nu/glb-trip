'use client';

import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_HOMEPAGE_DESTINATIONS } from '@/data/homepageDefaults';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const HOME_IMAGES_BUCKET = 'home-page-images';

export default function AdminHomepagePage() {
  const [destinations, setDestinations] = useState(DEFAULT_HOMEPAGE_DESTINATIONS);
  const [templates, setTemplates] = useState([]);
  const [homeImages, setHomeImages] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    let ignore = false;
    async function loadSettings() {
      try {
        const response = await fetch('/api/homepage-settings');
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore && Array.isArray(data?.destinations)) {
          setDestinations(data.destinations.length ? data.destinations : DEFAULT_HOMEPAGE_DESTINATIONS);
        }
      } catch (err) {
        console.warn('Failed to load homepage settings', err);
      }
    }
    loadSettings();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadTemplates() {
      try {
        const response = await fetch('/api/templates');
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore && Array.isArray(data?.templates)) {
          setTemplates(data.templates);
        }
      } catch (err) {
        console.warn('Failed to load templates', err);
      }
    }
    loadTemplates();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadHomeImages() {
      try {
        const { data, error } = await supabase.storage
          .from(HOME_IMAGES_BUCKET)
          .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

        if (error) {
          throw error;
        }

        const images = (data ?? [])
          .filter((file) => file?.name && !file.name.endsWith('/'))
          .map((file) => {
            const { data: publicData } = supabase.storage
              .from(HOME_IMAGES_BUCKET)
              .getPublicUrl(file.name);
            return {
              path: file.name,
              url: publicData?.publicUrl ?? '',
            };
          })
          .filter((image) => image.url);

        if (!ignore) {
          setHomeImages(images);
        }
      } catch (err) {
        console.warn('Failed to load homepage images', err);
      }
    }
    loadHomeImages();
    return () => {
      ignore = true;
    };
  }, [supabase]);

  function updateDestination(index, patch) {
    setDestinations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addDestination() {
    setDestinations((prev) => [
      ...prev,
      {
        city: '',
        country: '',
        color: 'from-slate-500 to-blue-500',
        templateId: null,
        imagePath: '',
      },
    ]);
  }

  function removeDestination(index) {
    setDestinations((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveSettings() {
    setStatus({ type: '', message: '' });
    setIsSaving(true);
    try {
      const response = await fetch('/api/homepage-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinations }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save settings.');
      }
      setStatus({ type: 'success', message: 'Homepage settings saved.' });
      if (Array.isArray(data?.destinations)) {
        setDestinations(data.destinations);
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to save settings.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Homepage settings</h1>
        <p className="text-sm text-neutral-400">
          Configure popular destinations and map them to templates shown on the homepage.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
        {destinations.map((item, index) => (
          <div key={`${item.city}-${index}`} className="grid gap-3 md:grid-cols-[1.2fr_1.2fr_1fr_1.6fr_auto]">
            <input
              value={item.city}
              onChange={(event) => updateDestination(index, { city: event.target.value })}
              placeholder="City"
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
            />
            <input
              value={item.country}
              onChange={(event) => updateDestination(index, { country: event.target.value })}
              placeholder="Country"
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
            />
            <select
              value={item.imagePath ?? ''}
              onChange={(event) => updateDestination(index, { imagePath: event.target.value })}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-orange-400 focus:outline-none"
            >
              <option value="">No image</option>
              {homeImages.map((image) => (
                <option key={image.path} value={image.path}>
                  {image.path}
                </option>
              ))}
            </select>
            <select
              value={item.templateId ?? ''}
              onChange={(event) =>
                updateDestination(index, { templateId: event.target.value || null })
              }
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-orange-400 focus:outline-none"
            >
              <option value="">No template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.destinationCountry})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeDestination(index)}
              className="rounded-xl border border-neutral-800 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-orange-400 hover:text-white transition"
            >
              Remove
            </button>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addDestination}
            className="rounded-xl border border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:border-orange-400 hover:text-white transition"
          >
            Add destination
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={saveSettings}
            className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-500/30 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save settings'}
          </button>
          {status.message ? (
            <span className={`text-xs ${status.type === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
              {status.message}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
