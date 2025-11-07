'use client';

import { useMemo, useState } from 'react';

const OPTIONS = [
  { value: '', label: 'Select type' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'hotel', label: 'Hotel' },
];

const BREAKFAST_OPTIONS = [
  { value: '', label: 'Breakfast included?' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export default function AccommodationCardPanel({
  card,
  onFieldChange,
  isDirty,
}) {
  const [expanded, setExpanded] = useState(false);
  const fields = card.fields ?? {};

  const priceDisplay = useMemo(
    () => card.priceLabel || fields.price || 'Set price',
    [card.priceLabel, fields.price]
  );

  const subtitle = useMemo(() => {
    if (fields.accommodationType) {
      return capitalise(fields.accommodationType);
    }
    return card.subtitle || 'Awaiting selection';
  }, [fields.accommodationType, card.subtitle]);

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
          <div className="h-12 w-12 rounded-full border bg-emerald-500/10 border-emerald-400/40 text-emerald-200 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M12 3l9 6v12a1 1 0 01-1 1h-6v-6h-4v6H4a1 1 0 01-1-1V9l9-6z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-100">
              Accommodation
            </p>
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-neutral-100">
            {priceDisplay || 'Set price'}
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
              label="Length of stay"
              name="lengthOfStay"
              value={fields.lengthOfStay ?? ''}
              onChange={handleChange}
              placeholder="3 nights"
            />
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-neutral-200">
                Type of accommodation
              </span>
              <select
                name="accommodationType"
                value={fields.accommodationType ?? ''}
                onChange={handleChange}
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-neutral-200">
                Breakfast included?
              </span>
              <select
                name="breakfastIncluded"
                value={fields.breakfastIncluded ?? ''}
                onChange={handleChange}
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {BREAKFAST_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Price"
              name="price"
              value={fields.price ?? ''}
              onChange={handleChange}
              placeholder="€140 / night"
            />
          </div>

          <Field
            label="Booking link"
            name="bookingLink"
            value={fields.bookingLink ?? ''}
            onChange={handleChange}
            placeholder="https://stay.com/reservation"
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

function capitalise(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
