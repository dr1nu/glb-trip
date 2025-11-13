'use client';

import { useMemo, useState } from 'react';

const BAGGAGE_OPTIONS = [
  { value: '', label: 'Select baggage' },
  { value: 'Small bag only', label: 'Small bag only' },
  { value: 'Cabin bag + small bag', label: 'Cabin bag + small bag' },
  { value: 'Checked in bag only', label: 'Checked in bag only' },
  {
    value: 'Checked in bag + cabin bag + small bag',
    label: 'Checked in Bag + Cabin Bag + Small Bag',
  },
];

const DATE_FIELDS = new Set(['departTime', 'arrivalTime']);

function planeIconColor(direction) {
  return direction === 'return'
    ? 'bg-purple-500/15 border-purple-400/40 text-purple-200'
    : 'bg-sky-500/15 border-sky-400/40 text-sky-200';
}

export default function FlightCardPanel({
  card,
  direction,
  onFieldChange,
  isDirty,
}) {
  const [expanded, setExpanded] = useState(false);
  const fields = card.fields ?? {};
  const airports = card.airports ?? {};
  const title = direction === 'return' ? 'Return flight' : 'Departure flight';
  const iconColors = planeIconColor(direction);
  const airportSummary =
    airports.from && airports.to
      ? `${airports.from} → ${airports.to}`
      : 'Set route';
  const priceDisplay = card.priceLabel || 'Set price';
  const baggageValue = fields.baggageType ?? '';
  const baggageOptions = useMemo(() => {
    if (!baggageValue) return BAGGAGE_OPTIONS;
    const exists = BAGGAGE_OPTIONS.some(
      (option) => option.value === baggageValue
    );
    return exists
      ? BAGGAGE_OPTIONS
      : [...BAGGAGE_OPTIONS, { value: baggageValue, label: baggageValue }];
  }, [baggageValue]);

  function handleChange(event) {
    const { name, value } = event.target;
    const nextValue = DATE_FIELDS.has(name) ? formatDateTimeLabel(value) : value;
    onFieldChange(card.id, { [name]: nextValue });
  }

  return (
    <article className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4">
      <header
        className="flex items-center justify-between gap-4 cursor-pointer select-none"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-4">
          <div
            className={`h-12 w-12 rounded-full border flex items-center justify-center ${iconColors}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M21 16.5v-1.764a1 1 0 00-.553-.894L13 10V5.5a1.5 1.5 0 00-3 0V10l-7.447 3.842A1 1 0 002 14.736V16.5l9-1.5v3.764l-2.553.894A1 1 0 008 21.5h2l1.333-.5L12.667 21.5H15a1 1 0 00.553-1.842L13 18.764V15l8 1.5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-100">{title}</p>
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              {airportSummary}
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
              label="Home airport"
              name="homeAirport"
              value={fields.homeAirport ?? ''}
              onChange={handleChange}
              placeholder="e.g. LHR"
            />
            <Field
              label="Arrival airport"
              name="arrivalAirport"
              value={fields.arrivalAirport ?? ''}
              onChange={handleChange}
              placeholder="e.g. CDG"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-neutral-200">Baggage type</span>
              <select
                name="baggageType"
                value={baggageValue}
                onChange={handleChange}
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {baggageOptions.map((option) => (
                  <option key={option.value || 'empty'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Flight departure time"
              name="departTime"
              type="datetime-local"
              value={formatDateTimeInputValue(fields.departTime)}
              onChange={handleChange}
              placeholder="2024-06-01T08:45"
            />
            <Field
              label="Flight arrival time"
              name="arrivalTime"
              type="datetime-local"
              value={formatDateTimeInputValue(fields.arrivalTime)}
              onChange={handleChange}
              placeholder="2024-06-01T12:10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Flight cost"
              name="price"
              value={fields.price ?? ''}
              onChange={handleChange}
              placeholder="€320 return"
            />
            <Field
              label="Booking link"
              name="bookingLink"
              value={fields.bookingLink ?? ''}
              onChange={handleChange}
              placeholder="https://airline.com/booking"
            />
          </div>

          <p className="text-[11px] text-neutral-500 text-right">
            Changes are saved when you click &ldquo;Save trip&rdquo; below.
          </p>
        </div>
      ) : null}
    </article>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-neutral-200">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
    </label>
  );
}

function formatDateTimeLabel(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const isoMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/
  );
  if (isoMatch) {
    return `${isoMatch[1]} · ${isoMatch[2]}`;
  }
  return trimmed;
}

function formatDateTimeInputValue(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const isoMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/
  );
  if (isoMatch) {
    return `${isoMatch[1]}T${isoMatch[2]}`;
  }
  const formattedMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})\s*·\s*(\d{2}:\d{2})/
  );
  if (formattedMatch) {
    return `${formattedMatch[1]}T${formattedMatch[2]}`;
  }
  const spaceMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/
  );
  if (spaceMatch) {
    return `${spaceMatch[1]}T${spaceMatch[2]}`;
  }
  return '';
}
