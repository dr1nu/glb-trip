'use client';

import { useEffect, useMemo, useState } from 'react';

const TYPE_OPTIONS = [
  {
    value: 'attraction',
    label: 'Attraction',
    description: 'Landmarks, tours, experiences',
    accent: 'from-purple-500/15 via-purple-100 to-pink-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
  },
  {
    value: 'photo',
    label: 'Photo stop',
    description: 'Scenic pause for pictures',
    accent: 'from-rose-400/15 via-pink-100 to-orange-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
  },
  {
    value: 'rest',
    label: 'Rest / sleep',
    description: 'Downtime or recharge',
    accent: 'from-slate-400/15 via-slate-100 to-white',
    border: 'border-slate-200',
    text: 'text-slate-700',
  },
  {
    value: 'food',
    label: 'Food & drink',
    description: 'Meals, cafes, bars',
    accent: 'from-orange-400/15 via-orange-100 to-amber-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
  },
  {
    value: 'accommodation',
    label: 'Accommodation',
    description: 'Hotels, stays, check-ins',
    accent: 'from-emerald-400/15 via-emerald-100 to-green-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
  },
  {
    value: 'flight',
    label: 'Flight',
    description: 'Departures or arrivals',
    accent: 'from-sky-400/15 via-sky-100 to-blue-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
  },
  {
    value: 'transport',
    label: 'Transport (train)',
    description: 'Rail, coach, long transfers',
    accent: 'from-indigo-400/15 via-indigo-100 to-blue-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
  },
];

const TRAVEL_MODES = [
  { value: '', label: 'No connector' },
  { value: 'walk', label: 'Walk' },
  { value: 'train', label: 'Train' },
  { value: 'tube', label: 'Tube / metro' },
  { value: 'taxi', label: 'Taxi' },
  { value: 'car', label: 'Car / transfer' },
  { value: 'flight', label: 'Flight' },
];

const FIELD_DEFS_BY_TYPE = {
  default: [
    { name: 'time', label: 'Start time', placeholder: '08:00' },
    { name: 'title', label: 'Title', placeholder: 'Breakfast at hotel' },
    { name: 'price', label: 'Badge or price', placeholder: 'Free or €18' },
    { name: 'link', label: 'Link', placeholder: 'https://experience.com' },
    {
      name: 'description',
      label: 'Description',
      placeholder: 'What happens here? Tickets, inclusions, or notes.',
      multiline: true,
    },
    { name: 'travelMode', label: 'Travel to next item', type: 'select', options: TRAVEL_MODES },
    { name: 'travelDuration', label: 'Travel duration (minutes)', placeholder: '10' },
  ],
  rest: [
    { name: 'time', label: 'Start time', placeholder: '22:00' },
    { name: 'title', label: 'Title', placeholder: 'Rest / downtime' },
    { name: 'link', label: 'Link (optional)', placeholder: 'https://stay.com' },
    {
      name: 'description',
      label: 'Description (optional)',
      placeholder: 'Notes about rest or recovery.',
      multiline: true,
    },
    { name: 'travelMode', label: 'Travel to next item (optional)', type: 'select', options: TRAVEL_MODES },
    { name: 'travelDuration', label: 'Travel duration (minutes, optional)', placeholder: '10' },
  ],
  accommodation: [
    { name: 'time', label: 'Start time', placeholder: '15:00' },
    { name: 'title', label: 'Title', placeholder: 'Check-in' },
    { name: 'link', label: 'Link (optional)', placeholder: 'https://hotel.com' },
    {
      name: 'description',
      label: 'Description (optional)',
      placeholder: 'Check-in, checkout, or stay notes.',
      multiline: true,
    },
    { name: 'travelMode', label: 'Travel to next item (optional)', type: 'select', options: TRAVEL_MODES },
    { name: 'travelDuration', label: 'Travel duration (minutes, optional)', placeholder: '10' },
  ],
};

const TYPE_META = TYPE_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

function getTypeMeta(type) {
  return (
    TYPE_META[type] ?? {
      label: 'Activity',
      description: 'Timeline item',
      accent: 'from-slate-200 via-white to-white',
      border: 'border-slate-200',
      text: 'text-slate-700',
    }
  );
}

function TypeIcon({ type }) {
  const className = 'h-5 w-5';
  switch (type) {
    case 'attraction':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2l8 4v2h-2l-1 12H7L6 8H4V6l8-4zm0 3.118L9.197 6.5h5.606L12 5.118zM9 8l.667 10h4.666L15 8H9z" />
        </svg>
      );
    case 'photo':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M4 6a2 2 0 012-2h2.172a2 2 0 001.414-.586l.828-.828A2 2 0 0111.828 2h.344a2 2 0 011.414.586l.828.828A2 2 0 0015.828 4H18a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm5 6a3 3 0 106 0 3 3 0 00-6 0z" />
        </svg>
      );
    case 'rest':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M3 5.5A1.5 1.5 0 014.5 4h6A1.5 1.5 0 0112 5.5V9h8a2 2 0 012 2v6h-2v-2H4v2H2V9a3.5 3.5 0 011-2.449V5.5zM4 11v2h16v-2H4z" />
        </svg>
      );
    case 'food':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M4 2h2v9a2 2 0 104 0V2h2v9a4 4 0 11-8 0V2zm12 0h2v8h2v12h-2v-6h-2V2z" />
        </svg>
      );
    case 'accommodation':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M3 11l9-7 9 7v10a1 1 0 01-1 1h-6v-6H10v6H4a1 1 0 01-1-1V11z" />
        </svg>
      );
    case 'flight':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M2 13l1-2 8 1.5V5.5A1.5 1.5 0 0112.5 4 1.5 1.5 0 0114 5.5V12L21 13l1 2-8-1.5v4L16 19v1l-4-.5L8 20v-1l2-1.5v-4L2 13z" />
        </svg>
      );
    case 'transport':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M5 4a3 3 0 013-3h8a3 3 0 013 3v14a3 3 0 01-3 3l1.5 1.5V23h-2l-2-2h-3l-2 2H5.5v-.5L7 21a3 3 0 01-2-3V4zm2 6h10V4a1 1 0 00-1-1H8a1 1 0 00-1 1v6zm0 2v3a1 1 0 001 1h8a1 1 0 001-1v-3H7z" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2a5 5 0 015 5c0 2.5-1.5 4.5-3 6l-2 3-2-3c-1.5-1.5-3-3.5-3-6a5 5 0 015-5zm0 7a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      );
  }
}

function TravelModeIcon({ mode }) {
  const className = 'h-4 w-4';
  switch (mode) {
    case 'walk':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M13 5a2 2 0 10-2-2 2 2 0 002 2zM9 22l1-4-2.5-3.5L5 18v4H3v-6l3-4 2-4 2.5 1 1.5-2.5L15 7l2 1-3 5 2 2v7h-2v-5l-2-2-1 4-2 3H9z" />
        </svg>
      );
    case 'train':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M7 3a5 5 0 00-5 5v8a3 3 0 003 3L3 21v1h2l3-2h8l3 2h2v-1l-2-2a3 3 0 003-3V8a5 5 0 00-5-5H7zm0 2h10a3 3 0 013 3v5H4V8a3 3 0 013-3zm0 12a1 1 0 110-2 1 1 0 010 2zm10 0a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      );
    case 'tube':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M12 2a7 7 0 017 7v4a7 7 0 01-14 0V9a7 7 0 017-7zm-9 8h2v4H3v-4zm15 7l1.5 3h-2.2l-.8-1.5H7.5L6.7 20H4.5L6 17h12zm3-3h-2v-4h2v4z" />
        </svg>
      );
    case 'taxi':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M7 4l1-2h8l1 2h3a2 2 0 012 2v4l-2 8h-2a2 2 0 01-4 0H10a2 2 0 01-4 0H4L2 10V6a2 2 0 012-2h3zm-3 6h16V6H4v4zm3 6a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      );
    case 'car':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M4 11l1.5-4.5A2 2 0 017.4 5h9.2a2 2 0 011.9 1.5L20 11v7h-2a2 2 0 01-4 0H10a2 2 0 01-4 0H4v-7zm2.4-4l-.9 3h13l-.9-3H6.4zM7 17a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      );
    case 'flight':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M2 13l1-2 8 1.5V5.5A1.5 1.5 0 0112.5 4 1.5 1.5 0 0114 5.5V12L21 13l1 2-8-1.5v4L16 19v1l-4-.5L8 20v-1l2-1.5v-4L2 13z" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
  }
}

function createEntry(type = 'attraction') {
  const defs = FIELD_DEFS_BY_TYPE[type] ?? FIELD_DEFS_BY_TYPE.default;
  const fields = defs.reduce((acc, field) => {
    acc[field.name] = '';
    return acc;
  }, {});
  const globalCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
  return {
    id:
      globalCrypto?.randomUUID?.() ??
      `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    fields,
  };
}

function getTimeline(card) {
  return Array.isArray(card?.timeline) ? card.timeline : [];
}

function timelinesEqual(a, b) {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

export default function DayTimelineBuilder({ dayCards, onTimelineChange }) {
  const dayOptions = useMemo(() => dayCards ?? [], [dayCards]);
  const [activeDayId, setActiveDayId] = useState(dayOptions[0]?.id ?? null);

  useEffect(() => {
    if (!activeDayId && dayOptions.length > 0) {
      setActiveDayId(dayOptions[0].id);
    } else if (activeDayId && !dayOptions.some((card) => card.id === activeDayId)) {
      setActiveDayId(dayOptions[0]?.id ?? null);
    }
  }, [activeDayId, dayOptions]);

  const activeDay =
    dayOptions.find((card) => card.id === activeDayId) ?? dayOptions[0] ?? null;
  const activeTimeline = activeDay ? getTimeline(activeDay) : [];

  function commitTimeline(nextTimeline) {
    if (!activeDay) return;
    if (timelinesEqual(activeTimeline, nextTimeline)) return;
    onTimelineChange?.(activeDay.id, nextTimeline);
  }

  function handleAddItem(type = TYPE_OPTIONS[0]?.value, index = activeTimeline.length) {
    if (!activeDay) return;
    const safeType = TYPE_META[type] ? type : TYPE_OPTIONS[0]?.value ?? 'attraction';
    const entry = createEntry(safeType);
    const next = [...activeTimeline];
    next.splice(index, 0, entry);
    commitTimeline(next);
  }

  function handleDelete(entryId) {
    const next = activeTimeline.filter((item) => item.id !== entryId);
    commitTimeline(next);
  }

  function handleFieldChange(entryId, field, value) {
    const next = activeTimeline.map((item) =>
      item.id === entryId
        ? {
            ...item,
            fields: {
              ...item.fields,
              [field]: value,
            },
          }
        : item
    );
    commitTimeline(next);
  }

  function handleTypeChange(entryId, type) {
    const safeType = TYPE_META[type] ? type : TYPE_OPTIONS[0]?.value ?? 'attraction';
    const next = activeTimeline.map((item) =>
      item.id === entryId
        ? {
            ...item,
            type: safeType,
          }
        : item
    );
    commitTimeline(next);
  }

  function handleDrop(event, index) {
    event.preventDefault();
    event.stopPropagation();
    const payloadRaw = event.dataTransfer.getData('application/json');
    if (!payloadRaw) return;
    try {
      const payload = JSON.parse(payloadRaw);
      if (payload.kind === 'new') {
        handleAddItem(payload.type, index);
      } else if (payload.kind === 'existing') {
        moveEntry(payload.entryId, index);
      }
    } catch {
      // ignore malformed payload
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function moveEntry(entryId, targetIndex) {
    const currentIndex = activeTimeline.findIndex((item) => item.id === entryId);
    if (currentIndex === -1) return;
    const entry = activeTimeline[currentIndex];
    const next = [...activeTimeline];
    next.splice(currentIndex, 1);

    let insertIndex = targetIndex;
    if (insertIndex > currentIndex) {
      insertIndex -= 1;
    }
    if (insertIndex < 0) insertIndex = 0;
    if (insertIndex > next.length) insertIndex = next.length;
    next.splice(insertIndex, 0, entry);
    commitTimeline(next);
  }

  if (!activeDay) {
    return (
      <section className="bg-white border border-orange-100 rounded-2xl p-6">
        <p className="text-sm text-[#4C5A6B]">
          Add day cards in the summary builder to enable timeline editing.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-orange-100 rounded-2xl p-6 space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Day-by-day builder</h2>
            <p className="text-sm text-[#4C5A6B]">
              Add a single itinerary card, pick its type for the icon, and attach optional travel to
              the next stop.
            </p>
          </div>
          <div className="inline-flex flex-wrap gap-2">
            {dayOptions.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setActiveDayId(card.id);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  card.id === activeDayId
                    ? 'bg-orange-500 text-neutral-900'
                    : 'bg-orange-50 text-[#4C5A6B] hover:text-slate-900'
                }`}
              >
                {card.title}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs uppercase tracking-wide text-[#4C5A6B]">
          {activeDay.subtitle}
        </p>
      </header>

      <Palette onAdd={handleAddItem} />

      <div
        className="space-y-3"
        onDragOver={handleDragOver}
        onDrop={(event) => handleDrop(event, activeTimeline.length)}
      >
        {activeTimeline.length === 0 ? (
          <div className="border border-dashed border-orange-100 rounded-2xl p-6 text-center text-sm text-[#4C5A6B]">
            Drag cards here or click a type above to start building {activeDay.title}.
          </div>
        ) : (
          activeTimeline.map((entry, index) => (
            <TimelineCard
              key={entry.id}
              entry={entry}
              index={index}
              onDropCard={(event) => handleDrop(event, index)}
              onDragOverCard={handleDragOver}
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  'application/json',
                  JSON.stringify({ kind: 'existing', entryId: entry.id })
                );
                event.dataTransfer.effectAllowed = 'move';
              }}
              onFieldChange={handleFieldChange}
              onTypeChange={handleTypeChange}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <p className="text-xs text-[#4C5A6B]">
        Changes are tracked automatically—remember to save the entire trip.
      </p>
    </section>
  );
}

function Palette({ onAdd }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {TYPE_OPTIONS.map((item) => (
        <button
          key={item.value}
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(
              'application/json',
              JSON.stringify({ kind: 'new', type: item.value })
            );
            event.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => onAdd(item.value)}
          className={`text-left border rounded-2xl p-4 bg-gradient-to-b ${item.accent} ${item.border} hover:border-orange-500/50 transition-colors space-y-3`}
        >
          <div
            className={`h-10 w-10 rounded-full border flex items-center justify-center ${item.border} ${item.text} bg-white/60`}
          >
            <TypeIcon type={item.value} />
          </div>
          <div>
            <p className="font-semibold">{item.label}</p>
            <p className="text-xs text-[#4C5A6B]">{item.description}</p>
          </div>
          <p className="text-[11px] text-[#4C5A6B]">
            One card style—pick the type for the correct icon. Travel connector is optional.
          </p>
        </button>
      ))}
    </div>
  );
}

function TimelineCard({
  entry,
  index,
  onDragStart,
  onDragOverCard,
  onDropCard,
  onFieldChange,
  onTypeChange,
  onDelete,
}) {
  const meta = getTypeMeta(entry.type);
  const fieldsForType = FIELD_DEFS_BY_TYPE[entry.type] ?? FIELD_DEFS_BY_TYPE.default;
  const titleValue =
    typeof entry.fields?.title === 'string' && entry.fields.title.trim()
      ? entry.fields.title.trim()
      : null;
  return (
    <div
      className={`border rounded-2xl bg-gradient-to-b ${meta.accent} ${meta.border} p-4 space-y-4`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOverCard}
      onDrop={onDropCard}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`h-11 w-11 rounded-full border flex items-center justify-center ${meta.border} ${meta.text} bg-white/60`}
          >
            <TypeIcon type={entry.type} />
          </div>
          <div>
            <p className="text-sm font-semibold capitalize text-slate-900">
              {titleValue ?? meta.label}
            </p>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[#4C5A6B]">
              <span>#{index + 1}</span>
              <span>•</span>
              <select
                value={entry.type}
                onChange={(event) => onTypeChange(entry.id, event.target.value)}
                className="bg-white/80 border border-orange-100 rounded-full px-2 py-0.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="text-xs text-[#4C5A6B] hover:text-red-400"
        >
          Remove
        </button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fieldsForType.map((field) => (
          <label key={field.name} className="flex flex-col gap-1 text-sm">
            <span className="text-[#4C5A6B]">{field.label}</span>
            {field.type === 'select' ? (
              <select
                value={entry.fields?.[field.name] ?? ''}
                onChange={(event) =>
                  onFieldChange(entry.id, field.name, event.target.value)
                }
                className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.multiline ? (
              <textarea
                value={entry.fields?.[field.name] ?? ''}
                onChange={(event) =>
                  onFieldChange(entry.id, field.name, event.target.value)
                }
                rows={3}
                className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={field.placeholder}
              />
            ) : (
              <input
                type="text"
                value={entry.fields?.[field.name] ?? ''}
                onChange={(event) =>
                  onFieldChange(entry.id, field.name, event.target.value)
                }
                className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={field.placeholder}
              />
            )}
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-[#4C5A6B]">
        <span>Drag to reorder. Travel connector fields are optional.</span>
        {entry.fields?.travelMode ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 border border-orange-100 text-[11px] font-semibold text-slate-700">
            <TravelModeIcon mode={entry.fields.travelMode} />
            {TRAVEL_MODES.find((mode) => mode.value === entry.fields.travelMode)?.label ??
              entry.fields.travelMode}
            {entry.fields.travelDuration ? ` • ${entry.fields.travelDuration}` : ''}
          </span>
        ) : null}
      </div>
    </div>
  );
}
