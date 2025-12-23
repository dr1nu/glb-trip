'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ItinerarySummary from '@/app/trip/[tripId]/_components/ItinerarySummary';
import { DEFAULT_HOMEPAGE_DESTINATIONS } from '@/data/homepageDefaults';
import { HOMEPAGE_TEMPLATES } from '@/data/homepageTemplates';

export default function PopularDestinationPage() {
  const params = useParams();
  const cityParam = Array.isArray(params?.city) ? params.city[0] : params?.city;
  const city = cityParam ? decodeURIComponent(cityParam) : '';
  const [destinations, setDestinations] = useState(DEFAULT_HOMEPAGE_DESTINATIONS);
  const [templatesById, setTemplatesById] = useState({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const activeDestination = useMemo(() => {
    if (!city) return null;
    const exactMatch = destinations.find((item) => item.city === city);
    if (exactMatch) return exactMatch;
    return (
      destinations.find((item) => item.city.toLowerCase() === city.toLowerCase()) ?? null
    );
  }, [city, destinations]);

  const selectedTemplate = activeDestination?.templateId
    ? templatesById[activeDestination.templateId]
    : HOMEPAGE_TEMPLATES[city];

  useEffect(() => {
    let ignore = false;
    async function loadHomepageConfig() {
      try {
        const response = await fetch('/api/homepage-settings');
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore && Array.isArray(data?.destinations) && data.destinations.length > 0) {
          setDestinations(data.destinations);
        }
      } catch (err) {
        console.warn('Failed to load homepage settings', err);
      } finally {
        if (!ignore) setLoadingSettings(false);
      }
    }
    loadHomepageConfig();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadTemplate() {
      if (!activeDestination?.templateId) return;
      if (templatesById[activeDestination.templateId]) return;
      setLoadingTemplate(true);
      try {
        const response = await fetch(`/api/templates/${activeDestination.templateId}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore && data?.template?.id) {
          setTemplatesById((prev) => ({ ...prev, [data.template.id]: data.template }));
        }
      } catch (err) {
        console.warn('Failed to load destination template', err);
      } finally {
        if (!ignore) setLoadingTemplate(false);
      }
    }
    loadTemplate();
    return () => {
      ignore = true;
    };
  }, [activeDestination, templatesById]);

  const showMissing = !loadingSettings && !activeDestination && !HOMEPAGE_TEMPLATES[city];

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#E9F2FF] via-white to-[#FFF6ED] text-neutral-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">
              Popular destination
            </p>
            <h1 className="text-3xl font-bold text-neutral-900">
              {city || 'Destination'}
            </h1>
            {activeDestination?.country ? (
              <p className="text-sm text-neutral-600">{activeDestination.country}</p>
            ) : null}
          </div>
          <Link
            href="/"
            className="rounded-2xl border border-orange-100 bg-white px-4 py-2 text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
          >
            Back to home
          </Link>
        </header>

        {showMissing ? (
          <section className="rounded-3xl border border-dashed border-orange-100 bg-white/90 p-8 text-center shadow-sm shadow-orange-50">
            <h2 className="text-xl font-semibold text-neutral-900">Destination not found</h2>
            <p className="mt-2 text-sm text-[#4C5A6B]">
              We couldn&apos;t find a sample itinerary for this destination yet.
            </p>
          </section>
        ) : (
          <section className="rounded-3xl border border-[#E3E6EF] bg-white p-6 shadow-xl shadow-orange-100/60">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[#C2461E]">
                Sample itinerary
              </p>
              <h2 className="text-2xl font-semibold text-neutral-900">
                {selectedTemplate?.name ?? `${city} sample`}
              </h2>
              <p className="text-sm text-[#4C5A6B]">
                {selectedTemplate?.summary ??
                  'A short preview to help you sense the vibe before you plan.'}
              </p>
            </div>
            <div className="mt-5">
              {loadingTemplate ? (
                <div className="rounded-2xl border border-slate-200/70 bg-white p-6 text-sm text-[#4C5A6B] shadow-sm shadow-slate-100">
                  Loading itinerary preview…
                </div>
              ) : selectedTemplate ? (
                <ItinerarySummary
                  cards={selectedTemplate.itinerary?.cards ?? []}
                  title={selectedTemplate.name}
                  description={
                    selectedTemplate.description ??
                    selectedTemplate.notes ??
                    'Sample itinerary preview.'
                  }
                />
              ) : (
                <div className="rounded-2xl border border-slate-200/70 bg-white p-6 text-sm text-[#4C5A6B] shadow-sm shadow-slate-100">
                  We&apos;re curating a sample itinerary for {city}. Check back soon.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
