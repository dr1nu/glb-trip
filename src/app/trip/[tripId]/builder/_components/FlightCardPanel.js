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
    onFieldChange(card.id, { [name]: value });
  }

  return (
    <article className="bg-gradient-to-b from-[#FFF4EB] via-white to-[#FFF9F4] border border-orange-100 rounded-2xl p-5 space-y-4">
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
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs uppercase tracking-wide text-[#4C5A6B]">
              {airportSummary}
            </p>
          </div>
        </div>
        <div className="text-right">
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
              <span className="font-medium text-[#4C5A6B]">Baggage type</span>
              <select
                name="baggageType"
                value={baggageValue}
                onChange={handleChange}
                className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {baggageOptions.map((option) => (
                  <option key={option.value || 'empty'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Flight date"
              name="flightDate"
              type="date"
              value={formatDateInputValue(fields.flightDate)}
              onChange={handleChange}
              placeholder="2024-06-01"
            />
            <Field
              label="Flight departure time"
              name="departTime"
              type="time"
              value={formatTimeInputValue(fields.departTime)}
              onChange={handleChange}
              placeholder="08:45"
            />
            <Field
              label="Flight arrival time"
              name="arrivalTime"
              type="time"
              value={formatTimeInputValue(fields.arrivalTime)}
              onChange={handleChange}
              placeholder="12:10"
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

          <p className="text-[11px] text-[#4C5A6B] text-right">
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

function formatTimeInputValue(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const timeMatch = trimmed.match(/^(\d{2}:\d{2})$/);
  if (timeMatch) return timeMatch[1];
  const dateTimeMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[T\s·]+(\d{2}:\d{2})/
  );
  if (dateTimeMatch) return dateTimeMatch[2];
  return '';
}
