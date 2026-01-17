'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bed,
  Camera,
  Car,
  CarTaxiFront,
  Church,
  Coffee,
  Footprints,
  Hotel,
  Landmark,
  MapPin,
  Plane,
  ShoppingBag,
  TrainFront,
  TramFront,
  Trees,
  Utensils,
  ExternalLink,
} from 'lucide-react';

const TYPE_OPTIONS = [
  {
    value: 'attraction',
    label: 'Attraction',
    description: 'Points of interest',
    accent: 'from-orange-400/15 via-orange-100 to-amber-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
  },
  {
    value: 'museum',
    label: 'Museum',
    description: 'Galleries, exhibitions',
    accent: 'from-purple-500/15 via-purple-100 to-pink-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
  },
  {
    value: 'park',
    label: 'Park',
    description: 'Gardens, nature stops',
    accent: 'from-emerald-400/15 via-emerald-100 to-green-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
  },
  {
    value: 'beach',
    label: 'Beach',
    description: 'Seaside time',
    accent: 'from-sky-400/15 via-sky-100 to-blue-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
  },
  {
    value: 'church',
    label: 'Church',
    description: 'Cathedrals, chapels',
    accent: 'from-slate-400/15 via-slate-100 to-white',
    border: 'border-slate-200',
    text: 'text-slate-700',
  },
  {
    value: 'shopping',
    label: 'Shopping',
    description: 'Markets, boutiques',
    accent: 'from-rose-400/15 via-pink-100 to-orange-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
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
    label: 'Eat & drink',
    description: 'Meals, cafes, bars',
    accent: 'from-amber-400/15 via-amber-100 to-yellow-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
  },
  {
    value: 'coffee',
    label: 'Coffee',
    description: 'Cafes and breaks',
    accent: 'from-yellow-400/15 via-amber-100 to-orange-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
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
  { value: 'tube', label: 'Tube / metro' },
  { value: 'taxi', label: 'Taxi' },
  { value: 'car', label: 'Car / transfer' },
];
const DISALLOWED_TRAVEL_MODES = new Set(['train', 'flight']);

const DEFAULT_DURATION_BY_TYPE = {
  attraction: '45',
  photo: '10',
  rest: '90',
  food: '90',
};

const FIELD_DEFS_BY_TYPE = {
  default: [
    { name: 'time', label: 'Start time', placeholder: '08:00' },
    { name: 'duration', label: 'Duration (minutes)', placeholder: '60' },
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
    { name: 'duration', label: 'Duration (minutes)', placeholder: '60' },
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
    { name: 'duration', label: 'Duration (minutes)', placeholder: '60' },
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

export const TIMELINE_TYPE_OPTIONS = TYPE_OPTIONS;

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

export function TypeIcon({ type }) {
  const className = 'h-5 w-5';
  const iconProps = { className, strokeWidth: 1.6, 'aria-hidden': true };
  switch (type) {
    case 'attraction':
      return <MapPin {...iconProps} />;
    case 'museum':
      return <Landmark {...iconProps} />;
    case 'park':
      return <Trees {...iconProps} />;
    case 'beach':
      return <MapPin {...iconProps} />;
    case 'church':
      return <Church {...iconProps} />;
    case 'shopping':
      return <ShoppingBag {...iconProps} />;
    case 'photo':
      return <Camera {...iconProps} />;
    case 'rest':
      return <Bed {...iconProps} />;
    case 'food':
      return <Utensils {...iconProps} />;
    case 'coffee':
      return <Coffee {...iconProps} />;
    case 'accommodation':
      return <Hotel {...iconProps} />;
    case 'flight':
      return <Plane {...iconProps} />;
    case 'transport':
      return <TrainFront {...iconProps} />;
    default:
      return <MapPin {...iconProps} />;
  }
}

function TravelModeIcon({ mode }) {
  const className = 'h-4 w-4';
  const iconProps = { className, strokeWidth: 1.6, 'aria-hidden': true };
  switch (mode) {
    case 'walk':
      return <Footprints {...iconProps} />;
    case 'train':
      return <TrainFront {...iconProps} />;
    case 'tube':
      return <TramFront {...iconProps} />;
    case 'taxi':
      return <CarTaxiFront {...iconProps} />;
    case 'car':
      return <Car {...iconProps} />;
    case 'flight':
      return <Plane {...iconProps} />;
    default:
      return <MapPin {...iconProps} />;
  }
}

function createEntry(type = 'attraction') {
  const defs = FIELD_DEFS_BY_TYPE[type] ?? FIELD_DEFS_BY_TYPE.default;
  const fields = defs.reduce((acc, field) => {
    acc[field.name] = '';
    return acc;
  }, {});
  const defaultDuration = DEFAULT_DURATION_BY_TYPE[type];
  if (typeof defaultDuration === 'string' && fields.duration === '') {
    fields.duration = defaultDuration;
  }
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

function parsePriceValue(raw) {
  if (typeof raw !== 'string') return 0;
  const match = raw.match(/[\d,.]+/);
  if (!match) return 0;
  const normalized = match[0].replace(/,/g, '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

function parseMinutes(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number.parseInt(trimmed, 10);
  return Number.isFinite(value) ? value : null;
}

function parseTimeToMinutes(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;
  const hours = Number.parseInt(parts[0], 10);
  const minutes = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatMinutesToTime(totalMinutes) {
  if (!Number.isFinite(totalMinutes)) return '';
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function deriveNextTime(entry) {
  const fields = entry?.fields ?? {};
  const startMinutes = parseTimeToMinutes(fields.time ?? '');
  const durationMinutes = parseMinutes(fields.duration ?? '');
  if (startMinutes == null || durationMinutes == null) return null;
  const travelMinutes = parseMinutes(fields.travelDuration ?? '');
  const includeTravel =
    typeof fields.travelMode === 'string' && fields.travelMode.trim() && travelMinutes != null;
  const totalMinutes = durationMinutes + (includeTravel ? travelMinutes : 0);
  return formatMinutesToTime(startMinutes + totalMinutes);
}

function propagateTimelineTimes(timeline, startIndex) {
  if (!Array.isArray(timeline)) return timeline;
  const next = [...timeline];
  for (let i = startIndex + 1; i < next.length; i += 1) {
    const derivedTime = deriveNextTime(next[i - 1]);
    if (!derivedTime) break;
    next[i] = {
      ...next[i],
      fields: {
        ...next[i].fields,
        time: derivedTime,
      },
    };
  }
  return next;
}

function sumTimelinePrices(timeline) {
  return (timeline ?? []).reduce((total, entry) => {
    const price = parsePriceValue(entry?.fields?.price ?? '');
    return total + price;
  }, 0);
}

export default function DayTimelineBuilder({
  dayCards,
  onTimelineChange,
  onMoveEntry,
  onSwapDays,
  onReorderDay,
  onAddDay,
  unassignedActivities,
  onAssignActivity,
  onUnassignedChange,
  onUnassignedTypeChange,
  onUnassignedDelete,
  onAddUnassigned,
  requestSummary,
  showRequestSummary = true,
}) {
  const dayOptions = useMemo(() => dayCards ?? [], [dayCards]);
  const [activeDayId, setActiveDayId] = useState(dayOptions[0]?.id ?? null);
  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [swapTargetId, setSwapTargetId] = useState('');
  const [pendingDayId, setPendingDayId] = useState(null);
  const showUnassignedSection = Array.isArray(unassignedActivities);

  useEffect(() => {
    if (!activeDayId && dayOptions.length > 0) {
      setActiveDayId(dayOptions[0].id);
    } else if (activeDayId && !dayOptions.some((card) => card.id === activeDayId)) {
      setActiveDayId(dayOptions[0]?.id ?? null);
    }
  }, [activeDayId, dayOptions]);

  useEffect(() => {
    if (pendingDayId && dayOptions.some((card) => card.id === pendingDayId)) {
      setActiveDayId(pendingDayId);
      setPendingDayId(null);
    }
  }, [pendingDayId, dayOptions]);

  useEffect(() => {
    setExpandedEntryId(null);
  }, [activeDayId]);

  useEffect(() => {
    if (showUnassignedSection && unassignedActivities.length > 0) {
      setShowUnassigned(true);
    }
  }, [unassignedActivities, showUnassignedSection]);

  const activeDay =
    dayOptions.find((card) => card.id === activeDayId) ?? dayOptions[0] ?? null;
  const activeTimeline = activeDay ? getTimeline(activeDay) : [];
  const dayTotal = useMemo(
    () => Math.round(sumTimelinePrices(activeTimeline)),
    [activeTimeline]
  );
  const activeDayIndex = dayOptions.findIndex((card) => card.id === activeDay?.id);

  function commitTimeline(nextTimeline) {
    if (!activeDay) return;
    if (timelinesEqual(activeTimeline, nextTimeline)) return;
    onTimelineChange?.(activeDay.id, nextTimeline);
  }

  function handleAddItem(type = TYPE_OPTIONS[0]?.value, index = activeTimeline.length) {
    if (!activeDay) return;
    const safeType = TYPE_META[type] ? type : TYPE_OPTIONS[0]?.value ?? 'attraction';
    const entry = createEntry(safeType);
    const previousEntry = activeTimeline[index - 1];
    const derivedNextTime = deriveNextTime(previousEntry);
    if (derivedNextTime) {
      entry.fields.time = derivedNextTime;
    }
    const next = [...activeTimeline];
    next.splice(index, 0, entry);
    commitTimeline(next);
    setExpandedEntryId(entry.id);
  }

  function handleDelete(entryId) {
    const next = activeTimeline.filter((item) => item.id !== entryId);
    commitTimeline(next);
  }

  function handleFieldChange(entryId, field, value) {
    const entryIndex = activeTimeline.findIndex((item) => item.id === entryId);
    if (entryIndex === -1) return;
    const next = activeTimeline.map((item, index) => {
      if (item.id !== entryId) return item;
      return {
        ...item,
        fields: {
          ...item.fields,
          [field]: value,
        },
      };
    });
    const shouldPropagate = ['time', 'duration', 'travelMode', 'travelDuration'].includes(field);
    const finalTimeline = shouldPropagate ? propagateTimelineTimes(next, entryIndex) : next;
    commitTimeline(finalTimeline);
  }

  function handleTypeChange(entryId, type) {
    const safeType = TYPE_META[type] ? type : TYPE_OPTIONS[0]?.value ?? 'attraction';
    const entryIndex = activeTimeline.findIndex((item) => item.id === entryId);
    if (entryIndex === -1) return;
    const next = activeTimeline.map((item) =>
      item.id === entryId
        ? {
            ...item,
            type: safeType,
            fields: (() => {
              const defaultDuration = DEFAULT_DURATION_BY_TYPE[safeType];
              if (
                typeof defaultDuration === 'string' &&
                (item.fields?.duration == null || item.fields.duration === '')
              ) {
                return {
                  ...(item.fields ?? {}),
                  duration: defaultDuration,
                };
              }
              return item.fields ?? {};
            })(),
          }
        : item
    );
    const finalTimeline = propagateTimelineTimes(next, entryIndex);
    commitTimeline(finalTimeline);
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

  function handleAddAttraction() {
    handleAddItem('attraction', activeTimeline.length);
  }

  function handleSwapDays() {
    if (!activeDay || !swapTargetId) return;
    onSwapDays?.(activeDay.id, swapTargetId);
    setSwapTargetId('');
  }

  function handleAddDay() {
    if (!onAddDay) return;
    const nextId = onAddDay();
    if (nextId) {
      setPendingDayId(nextId);
    }
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
    <div
      className={`grid gap-6 justify-center ${
        showRequestSummary
          ? 'lg:grid-cols-[240px_minmax(0,56rem)_260px]'
          : 'lg:grid-cols-[240px_minmax(0,56rem)]'
      }`}
    >
      <aside className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#4C5A6B]">
            Building blocks
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-1">Add items</p>
        </div>
        <Palette onAdd={handleAddItem} />
      </aside>

      <section className="bg-white border border-orange-100 rounded-2xl p-6 space-y-5">
        <header className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Day-by-day builder</h2>
                <p className="text-sm text-[#4C5A6B]">
                  Add a single itinerary card, pick its type for the icon, and attach optional
                  travel to the next stop.
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
                {onAddDay ? (
                  <button
                    type="button"
                    onClick={handleAddDay}
                    className="px-3 py-1.5 rounded-full text-sm font-semibold border border-orange-100 text-orange-600 hover:bg-orange-50"
                  >
                    Add day
                  </button>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wide text-[#4C5A6B]">
              <span>{activeDay.subtitle}</span>
              <span>{dayTotal > 0 ? `Day total: €${dayTotal}` : 'Day total: —'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#4C5A6B]">
              <button
                type="button"
                onClick={() => onReorderDay?.(activeDay.id, -1)}
                disabled={activeDayIndex <= 0}
                className="rounded-full border border-orange-100 px-3 py-1 font-semibold disabled:opacity-50"
              >
                Move earlier
              </button>
              <button
                type="button"
                onClick={() => onReorderDay?.(activeDay.id, 1)}
                disabled={activeDayIndex === -1 || activeDayIndex >= dayOptions.length - 1}
                className="rounded-full border border-orange-100 px-3 py-1 font-semibold disabled:opacity-50"
              >
                Move later
              </button>
              <label className="flex items-center gap-2">
                <span>Swap with</span>
                <select
                  value={swapTargetId}
                  onChange={(event) => setSwapTargetId(event.target.value)}
                  className="rounded-full border border-orange-100 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Select day</option>
                  {dayOptions
                    .filter((card) => card.id !== activeDay.id)
                    .map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.title}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                onClick={handleSwapDays}
                disabled={!swapTargetId}
                className="rounded-full border border-orange-100 px-3 py-1 font-semibold disabled:opacity-50"
              >
                Swap
              </button>
            </div>
          </header>

          <div
            className="space-y-3"
            onDragOver={handleDragOver}
            onDrop={(event) => handleDrop(event, activeTimeline.length)}
          >
            {activeTimeline.length === 0 ? (
              <div className="border border-dashed border-orange-100 rounded-2xl p-6 text-center text-sm text-[#4C5A6B]">
                Drag cards here or click a type on the left to start building {activeDay.title}.
              </div>
            ) : (
              activeTimeline.map((entry, index) => (
                <TimelineCard
                  key={entry.id}
                  entry={entry}
                  index={index}
                  nextEntry={activeTimeline[index + 1]}
                  dayOptions={dayOptions}
                  activeDayId={activeDay.id}
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
                  onMoveEntry={(entryId, targetDayId) =>
                    onMoveEntry?.(entryId, activeDay.id, targetDayId)
                  }
                  isExpanded={expandedEntryId === entry.id}
                  onToggle={() =>
                    setExpandedEntryId((prev) => (prev === entry.id ? null : entry.id))
                  }
                />
              ))
            )}
            <button
              type="button"
              onClick={handleAddAttraction}
              className="flex items-center justify-center gap-2 w-full border border-dashed border-orange-200 rounded-2xl px-4 py-3 text-sm font-semibold text-orange-600 hover:bg-orange-50"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-600">
                +
              </span>
              Add attraction
            </button>
          </div>

          {showUnassignedSection ? (
            <section className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4 space-y-3">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnassigned((prev) => !prev)}
                  className="text-sm font-semibold text-slate-900"
                >
                  {showUnassigned ? 'Hide' : 'Show'} unassigned activities
                </button>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#4C5A6B]">
                  <span>
                    {unassignedActivities.length
                      ? `${unassignedActivities.length} in pool`
                      : 'None yet'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAddUnassigned?.()}
                    className="inline-flex items-center justify-center rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-600"
                  >
                    Add activity
                  </button>
                </div>
              </header>
              {showUnassigned ? (
                <div className="space-y-3">
                  {unassignedActivities.length ? (
                    unassignedActivities.map((activity) => (
                      <UnassignedActivityCard
                        key={activity.id}
                        activity={activity}
                        dayCards={dayOptions}
                        onAssign={onAssignActivity}
                        onChange={onUnassignedChange}
                        onTypeChange={onUnassignedTypeChange}
                        onDelete={onUnassignedDelete}
                      />
                    ))
                  ) : (
                    <div className="border border-dashed border-orange-100 rounded-xl px-4 py-6 text-sm text-[#4C5A6B] text-center">
                      All optional activities are assigned. Anything left here will show in the
                      Other Activities tab for travellers.
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          ) : null}

          <p className="text-xs text-[#4C5A6B]">
            Changes are tracked automatically—remember to save the entire trip.
          </p>
      </section>

      {showRequestSummary ? (
        <aside className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#4C5A6B]">
              Request
            </p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              Traveller summary
            </p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4 space-y-3 text-sm text-slate-700">
            <RequestItem label="Dates" value={requestSummary?.dates} />
            <RequestItem label="Travellers" value={requestSummary?.travellers} />
            <RequestItem label="Day trips" value={requestSummary?.dayTrips} />
            <RequestItem label="Special requests" value={requestSummary?.requests} />
            <RequestItem label="Budget" value={requestSummary?.budget} />
            <RequestItem label="Interests" value={requestSummary?.interests} />
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function Palette({ onAdd }) {
  return (
    <div className="grid grid-cols-1 gap-2">
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
          className={`text-left border rounded-2xl p-3 bg-gradient-to-b ${item.accent} ${item.border} hover:border-orange-500/50 transition-colors space-y-2`}
        >
          <div
            className={`h-9 w-9 rounded-full border flex items-center justify-center ${item.border} ${item.text} bg-white/60`}
          >
            <TypeIcon type={item.value} />
          </div>
          <div>
            <p className="font-semibold">{item.label}</p>
            <p className="text-xs text-[#4C5A6B]">{item.description}</p>
          </div>
          <span className="sr-only">Add a timeline item of this type.</span>
        </button>
      ))}
    </div>
  );
}

function TimelineCard({
  entry,
  index,
  nextEntry,
  dayOptions,
  activeDayId,
  onDragStart,
  onDragOverCard,
  onDropCard,
  onFieldChange,
  onTypeChange,
  onDelete,
  onMoveEntry,
  isExpanded,
  onToggle,
}) {
  const meta = getTypeMeta(entry.type);
  const fieldsForType = FIELD_DEFS_BY_TYPE[entry.type] ?? FIELD_DEFS_BY_TYPE.default;
  const titleValue =
    typeof entry.fields?.title === 'string' && entry.fields.title.trim()
      ? entry.fields.title.trim()
      : null;
  const travelMode = typeof entry.fields?.travelMode === 'string' ? entry.fields.travelMode.trim() : '';
  const currentTitle = titleValue ?? meta.label;
  const nextTitle = getEntryTitle(nextEntry);
  const directionsUrl =
    travelMode && !DISALLOWED_TRAVEL_MODES.has(travelMode) && nextTitle
      ? buildDirectionsUrl(currentTitle, nextTitle, travelMode)
      : '';
  const [moveTargetId, setMoveTargetId] = useState('');
  return (
    <div
      className={`border rounded-2xl bg-gradient-to-b ${meta.accent} ${meta.border} p-4 space-y-4 cursor-grab active:cursor-grabbing`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOverCard}
      onDrop={onDropCard}
      onClick={onToggle}
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
                onClick={(event) => event.stopPropagation()}
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle?.();
            }}
            className="text-xs font-semibold text-[#4C5A6B] hover:text-slate-900"
          >
            {isExpanded ? 'Hide details' : 'Show details'}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(entry.id);
            }}
            className="text-xs text-[#4C5A6B] hover:text-red-400"
          >
            Remove
          </button>
        </div>
      </header>
      {isExpanded ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          onClick={(event) => event.stopPropagation()}
        >
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
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-sm flex-1">
              <span className="text-[#4C5A6B]">Move to day</span>
              <select
                value={moveTargetId}
                onChange={(event) => setMoveTargetId(event.target.value)}
                className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select day</option>
                {dayOptions
                  .filter((card) => card.id !== activeDayId)
                  .map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.title}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                if (!moveTargetId) return;
                onMoveEntry?.(entry.id, moveTargetId);
                setMoveTargetId('');
              }}
              disabled={!moveTargetId}
              className="rounded-xl border border-orange-100 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
            >
              Move
            </button>
          </div>
        </div>
      ) : (
        <span className="sr-only">Details collapsed</span>
      )}
      {travelMode && !DISALLOWED_TRAVEL_MODES.has(travelMode) ? (
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-[#4C5A6B]">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 border border-orange-100 text-[11px] font-semibold text-slate-700">
            <TravelModeIcon mode={travelMode} />
            {TRAVEL_MODES.find((mode) => mode.value === travelMode)?.label ?? travelMode}
            {entry.fields.travelDuration ? ` • ${entry.fields.travelDuration}` : ''}
          </span>
          {directionsUrl ? (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 border border-orange-100 text-[11px] font-semibold text-slate-700 hover:bg-white"
            >
              Directions <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function UnassignedActivityCard({ activity, dayCards, onAssign, onChange, onTypeChange, onDelete }) {
  const fields = activity.fields ?? {};
  const [dayId, setDayId] = useState(dayCards[0]?.id ?? '');

  useEffect(() => {
    if (!dayCards.length) return;
    if (!dayId || !dayCards.some((card) => card.id === dayId)) {
      setDayId(dayCards[0].id);
    }
  }, [dayCards, dayId]);

  const description =
    typeof fields.description === 'string' && fields.description.trim()
      ? fields.description.trim()
      : '';
  const price =
    typeof fields.price === 'string' && fields.price.trim()
      ? fields.price.trim()
      : '';
  const link = typeof fields.link === 'string' ? fields.link.trim() : '';

  return (
    <article className="bg-gradient-to-b from-[#FFF4EB] via-white to-[#FFF9F4] border border-orange-100 rounded-2xl p-4 space-y-3">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-full border border-orange-200 bg-white flex items-center justify-center text-orange-500">
            <TypeIcon type={activity.type} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {fields.title?.trim() || 'Untitled activity'}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-[#4C5A6B]">
              Not scheduled yet
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {price ? (
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-white text-slate-900 border border-orange-100">
              {price}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete?.(activity.id)}
            className="text-xs text-[#4C5A6B] hover:text-red-400"
          >
            Remove
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[#4C5A6B]">Type</span>
          <select
            value={activity.type}
            onChange={(event) => onTypeChange?.(activity.id, event.target.value)}
            className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {TIMELINE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          <span className="text-[#4C5A6B]">Title</span>
          <input
            type="text"
            value={fields.title ?? ''}
            onChange={(event) => onChange?.(activity.id, 'title', event.target.value)}
            placeholder="Cooking class, sunset walk, backup museum"
            className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[#4C5A6B]">Description</span>
          <textarea
            rows={2}
            value={description}
            onChange={(event) => onChange?.(activity.id, 'description', event.target.value)}
            placeholder="Why it matters, inclusions, or notes."
            className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[#4C5A6B]">Suggested time</span>
            <input
              type="text"
              value={fields.time ?? ''}
              onChange={(event) => onChange?.(activity.id, 'time', event.target.value)}
              placeholder="e.g. 18:00 or Afternoon"
              className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[#4C5A6B]">Badge or price</span>
            <input
              type="text"
              value={fields.price ?? ''}
              onChange={(event) => onChange?.(activity.id, 'price', event.target.value)}
              placeholder="Free or €25"
              className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-[#4C5A6B]">Link</span>
            <input
              type="text"
              value={link}
              onChange={(event) => onChange?.(activity.id, 'link', event.target.value)}
              placeholder="https://experience.com"
              className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <label className="flex items-center gap-2 text-sm text-[#4C5A6B]">
          <span>Assign to</span>
          <select
            value={dayId}
            onChange={(event) => setDayId(event.target.value)}
            className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {dayCards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => onAssign?.(activity.id, dayId)}
          disabled={!dayId || !dayCards.length}
          className={`inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
            !dayId || !dayCards.length
              ? 'bg-orange-100 text-[#4C5A6B] cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600 text-neutral-900'
          }`}
        >
          Add to day
        </button>
      </div>
    </article>
  );
}

function getEntryTitle(entry) {
  if (!entry) return '';
  const fields = entry?.fields ?? {};
  if (typeof fields.title === 'string' && fields.title.trim()) {
    return fields.title.trim();
  }
  const meta = getTypeMeta(entry.type);
  return meta.label;
}

function buildDirectionsUrl(origin, destination, travelMode) {
  if (!origin || !destination) return '';
  const modeMap = {
    walk: 'walking',
    tube: 'transit',
    taxi: 'driving',
    car: 'driving',
  };
  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
  });
  const mappedMode = modeMap[travelMode];
  if (mappedMode) params.set('travelmode', mappedMode);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function RequestItem({ label, value }) {
  return (
    <div className="rounded-xl border border-orange-100 bg-white/80 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-[#4C5A6B]">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-900 mt-1">
        {value || '—'}
      </div>
    </div>
  );
}
