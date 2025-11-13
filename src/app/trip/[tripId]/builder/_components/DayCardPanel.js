'use client';

import { useMemo, useState } from 'react';

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
    <article className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4">
      <header
        className="flex items-center justify-between gap-4 cursor-pointer select-none"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full border bg-rose-500/10 border-rose-400/40 text-rose-200 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M12 2C8.134 2 5 5.067 5 8.857 5 14.571 12 22 12 22s7-7.429 7-13.143C19 5.067 15.866 2 12 2zm0 9.714a2.857 2.857 0 110-5.714 2.857 2.857 0 010 5.714z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-100">{card.title}</p>
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-neutral-100">
            {priceDisplay || 'Set daily cost'}
          </div>
          <div className="text-xs text-neutral-500">
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
          <p className="text-[11px] text-neutral-500 text-right">
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
      <span className="font-medium text-neutral-200">{label}</span>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
    </label>
  );
}
