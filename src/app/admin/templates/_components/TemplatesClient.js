'use client';

import { useMemo, useState } from 'react';
import AdminNav from '../../_components/AdminNav';
import TemplateCreator from './TemplateCreator';
import TemplateList from './TemplateList';

export default function TemplatesClient({ templates, trips, tripCount }) {
  const [showCreator, setShowCreator] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');

  const filteredTemplates = useMemo(() => {
    const query = locationQuery.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((template) =>
      (template.destinationCountry || '').toLowerCase().includes(query)
    );
  }, [templates, locationQuery]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-6 py-6">
      <div className="border-b border-slate-200 pb-4">
        <AdminNav tripCount={tripCount} />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Trip Templates</h2>
          <p className="text-sm text-slate-500">
            Create and manage reusable itinerary templates
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative">
            <span className="sr-only">Filter by location</span>
            <input
              type="search"
              placeholder="Filter by location..."
              value={locationQuery}
              onChange={(event) => setLocationQuery(event.target.value)}
              className="h-11 w-64 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
            {templates.length} saved
          </span>
          <button
            type="button"
            onClick={() => setShowCreator(true)}
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-orange-400"
          >
            <span className="text-base leading-none">+</span>
            New Template
          </button>
        </div>
      </div>

      {showCreator ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Create template</h3>
          <p className="mt-1 text-sm text-slate-500">
            Start with a recent trip and refine the plan before saving.
          </p>
          <div className="mt-5">
            <TemplateCreator
              trips={trips}
              onCreated={() => setShowCreator(false)}
            />
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Saved templates</h3>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <TemplateList templates={filteredTemplates} />
        </div>
      </section>
    </section>
  );
}
