'use client';

import { useMemo, useState } from 'react';
import { Hotel } from 'lucide-react';

const OPTIONS = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'shared-bathroom-room', label: 'Room w/ shared Bathroom' },
  { value: 'luxury-hotel', label: 'Luxury Hotel' },
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
  onRemove,
  canRemove = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const fields = card.fields ?? {};

  const priceDisplay = useMemo(
    () => card.priceLabel || fields.price || 'Set price',
    [card.priceLabel, fields.price]
  );

  const subtitle = useMemo(() => {
    const selected =
      typeof fields.accommodationType === 'string'
        ? fields.accommodationType.trim()
        : '';
    if (selected) {
      return OPTIONS.find((option) => option.value === selected)?.label || selected;
    }
    return card.subtitle || 'Awaiting selection';
  }, [fields.accommodationType, card.subtitle]);
  const title = card.title || 'Accommodation';

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
          <div className="h-12 w-12 rounded-full border bg-emerald-500/10 border-emerald-400/40 text-emerald-200 flex items-center justify-center">
            <Hotel className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {title}
            </p>
            <p className="text-xs uppercase tracking-wide text-[#4C5A6B]">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="text-right">
          {canRemove ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemove?.();
              }}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600"
            >
              Remove
            </button>
          ) : null}
          <div className="text-sm font-semibold text-slate-900">
            {priceDisplay || 'Set price'}
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
              label="Length of stay"
              name="lengthOfStay"
              value={fields.lengthOfStay ?? ''}
              onChange={handleChange}
              placeholder="3 nights"
            />
            <Field
              label="Check-in date"
              name="accommodationDateFrom"
              type="date"
              value={formatDateInputValue(fields.accommodationDateFrom)}
              onChange={handleChange}
              placeholder="2024-06-01"
            />
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[#4C5A6B]">
                Type of accommodation
              </span>
              <select
                name="accommodationType"
                value={fields.accommodationType ?? ''}
                onChange={handleChange}
                className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="" disabled>
                  Select an option
                </option>
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
              <span className="font-medium text-[#4C5A6B]">
                Breakfast included?
              </span>
              <select
                name="breakfastIncluded"
                value={fields.breakfastIncluded ?? ''}
                onChange={handleChange}
                className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
            <Field
              label="Check-out date"
              name="accommodationDateTo"
              type="date"
              value={formatDateInputValue(fields.accommodationDateTo)}
              onChange={handleChange}
              placeholder="2024-06-04"
            />
          </div>

          <Field
            label="Booking link"
            name="bookingLink"
            value={fields.bookingLink ?? ''}
            onChange={handleChange}
            placeholder="https://stay.com/reservation"
          />
          <Field
            label="Google Maps link"
            name="accommodationMapUrl"
            value={fields.accommodationMapUrl ?? ''}
            onChange={handleChange}
            placeholder="Paste a Google Maps URL or iframe"
          />

          <p className="text-[11px] text-[#4C5A6B] text-right">
            Changes are saved when you click &ldquo;Save trip&rdquo; below.
          </p>
        </div>
      ) : null}
    </article>
  );
}

function Field({ label, name, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-[#4C5A6B]">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
    </label>
  );
}

function formatDateInputValue(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const dateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateMatch) return dateMatch[1];
  const dateTimeMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[T\s·]+(\d{2}:\d{2})/
  );
  if (dateTimeMatch) return dateTimeMatch[1];
  return '';
}

function capitalise(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
