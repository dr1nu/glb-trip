'use client';

import { useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';

export default function DayCardPanel({ card, onFieldChange, isDirty }) {
  const [expanded, setExpanded] = useState(false);
  const fields = card.fields ?? {};

  const subtitle = useMemo(() => {
    if (fields.city) return fields.city;
    return card.subtitle || 'Destination';
  }, [fields.city, card.subtitle]);

  const priceDisplay = useMemo(
    () => card.priceLabel || fields.dailyCost || 'Set daily cost',
    [card.priceLabel, fields.dailyCost]
  );

  function handleChange(event) {
    const { name, value } = event.target;
    onFieldChange(card.id, { [name]: value });
  }

  return (
    <article className="bg-gradient-to-b from-[#FFF4EB] via-white to-[#FFF9F4] border border-orange-100 rounded-2xl p-5 space-y-4">
      <header
        className="flex items-center justify-between gap-4 cursor-pointer select-none"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full border bg-rose-500/10 border-rose-400/40 text-rose-200 flex items-center justify-center">
            <MapPin className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{card.title}</p>
            <p className="text-xs uppercase tracking-wide text-[#4C5A6B]">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-900">
            {priceDisplay || 'Set daily cost'}
          </div>
          <div className="text-xs text-[#4C5A6B]">
            {expanded ? 'Hide details' : 'Expand details'}
          </div>
          {isDirty ? (
            <div className="text-[10px] uppercase tracking-wide text-orange-300 mt-1">
              Unsaved edits
            </div>
          ) : null}
        </div>
      </header>

      {expanded ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="City"
              name="city"
              value={fields.city ?? ''}
              onChange={handleChange}
              placeholder="e.g. Paris"
            />
            <Field
              label="Daily cost"
              name="dailyCost"
              value={fields.dailyCost ?? ''}
              onChange={handleChange}
              placeholder="€120"
            />
          </div>
          <Field
            label="Highlight attraction"
            name="highlightAttraction"
            value={fields.highlightAttraction ?? ''}
            onChange={handleChange}
            placeholder="Louvre Museum, Seine cruise"
          />
          <p className="text-[11px] text-[#4C5A6B] text-right">
            Changes are saved when you click &ldquo;Save trip&rdquo; below.
          </p>
        </div>
      ) : null}
    </article>
  );
}

function Field({ label, name, value, onChange, placeholder }) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-[#4C5A6B]">{label}</span>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
    </label>
  );
}
