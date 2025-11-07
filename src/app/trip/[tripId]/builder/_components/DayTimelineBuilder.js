'use client';

import { useEffect, useMemo, useState } from 'react';

const PALETTE_ITEMS = [
  {
    type: 'transport',
    title: 'Transport',
    description: 'Add transfers, trains, or flights',
    iconColor: 'bg-sky-500/10 border-sky-400/40 text-sky-200',
  },
  {
    type: 'attraction',
    title: 'Attraction',
    description: 'Highlight sights or experiences',
    iconColor: 'bg-purple-500/10 border-purple-400/40 text-purple-200',
  },
  {
    type: 'food',
    title: 'Food & drink',
    description: 'Restaurants, cafes, bars',
    iconColor: 'bg-emerald-500/10 border-emerald-400/40 text-emerald-200',
  },
];

const FIELD_MAP = {
  transport: [
    { name: 'time', label: 'Time', placeholder: '08:30' },
    { name: 'price', label: 'Price', placeholder: '€40' },
    { name: 'link', label: 'Link', placeholder: 'https://carrier.com' },
    {
      name: 'description',
      label: 'Description',
      placeholder: 'Private transfer to hotel',
      multiline: true,
    },
  ],
  attraction: [
    { name: 'time', label: 'Time', placeholder: '14:00' },
    { name: 'price', label: 'Price', placeholder: '€25' },
    { name: 'link', label: 'Link', placeholder: 'https://experience.com' },
    {
      name: 'description',
      label: 'Description',
      placeholder: 'Guided tour of the old town',
      multiline: true,
    },
  ],
  food: [
    { name: 'name', label: 'Name', placeholder: 'Cafe Central' },
    {
      name: 'description',
      label: 'Description',
      placeholder: 'Dinner reservation with wine pairing',
      multiline: true,
    },
  ],
};

function createEntry(type) {
  const fieldsTemplate = FIELD_MAP[type] ?? [];
  const fields = fieldsTemplate.reduce((acc, field) => {
    acc[field.name] = '';
    return acc;
  }, {});
  const globalCrypto =
    typeof globalThis !== 'undefined' ? globalThis.crypto : null;
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
    } else if (
      activeDayId &&
      !dayOptions.some((card) => card.id === activeDayId)
    ) {
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

  function handleAddItem(type, index = activeTimeline.length) {
    if (!activeDay) return;
    const entry = createEntry(type);
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
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <p className="text-sm text-neutral-400">
          Add day cards in the summary builder to enable timeline editing.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Day-by-day builder</h2>
            <p className="text-sm text-neutral-400">
              Drag items into a day to craft transport, attractions, and dining plans.
            </p>
          </div>
          <div className="inline-flex flex-wrap gap-2">
            {dayOptions.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setFeedback({ type: '', message: '' });
                  setActiveDayId(card.id);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  card.id === activeDayId
                    ? 'bg-orange-500 text-neutral-900'
                    : 'bg-neutral-800 text-neutral-400 hover:text-neutral-100'
                }`}
              >
                {card.title}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs uppercase tracking-wide text-neutral-500">
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
          <div className="border border-dashed border-neutral-700 rounded-2xl p-6 text-center text-sm text-neutral-500">
            Drag cards here or click a card above to start building {activeDay.title}.
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
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <p className="text-xs text-neutral-500">
        Changes are tracked automatically—remember to save the entire trip.
      </p>
    </section>
  );
}

function Palette({ onAdd }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {PALETTE_ITEMS.map((item) => (
        <button
          key={item.type}
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(
              'application/json',
              JSON.stringify({ kind: 'new', type: item.type })
            );
            event.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => onAdd(item.type)}
          className="text-left border border-neutral-800 rounded-2xl p-4 bg-neutral-950 hover:border-orange-500/50 transition-colors space-y-3"
        >
          <div className={`h-10 w-10 rounded-full border ${item.iconColor} flex items-center justify-center`}>
            <span className="text-sm font-semibold uppercase">{item.title.charAt(0)}</span>
          </div>
          <div>
            <p className="font-semibold">{item.title}</p>
            <p className="text-xs text-neutral-400">{item.description}</p>
          </div>
          <p className="text-[11px] text-neutral-500">
            Drag to the day timeline or click to append.
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
  onDelete,
}) {
  const fields = FIELD_MAP[entry.type] ?? [];
  const paletteMeta = PALETTE_ITEMS.find((item) => item.type === entry.type);
  return (
    <div
      className="border border-neutral-800 rounded-2xl bg-neutral-950 p-4 space-y-3"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOverCard}
      onDrop={onDropCard}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`h-11 w-11 rounded-full border ${paletteMeta?.iconColor ?? 'bg-neutral-800 text-neutral-300 border-neutral-700'} flex items-center justify-center`}
          >
            <span className="text-sm font-semibold capitalize">
              {entry.type.slice(0, 1).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold capitalize">
              {entry.type}
            </p>
            <p className="text-xs text-neutral-500">Item {index + 1}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="text-xs text-neutral-400 hover:text-red-300"
        >
          Remove
        </button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((field) => (
          <label key={field.name} className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-400">{field.label}</span>
            {field.multiline ? (
              <textarea
                value={entry.fields?.[field.name] ?? ''}
                onChange={(event) =>
                  onFieldChange(entry.id, field.name, event.target.value)
                }
                rows={3}
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={field.placeholder}
              />
            ) : (
              <input
                type="text"
                value={entry.fields?.[field.name] ?? ''}
                onChange={(event) =>
                  onFieldChange(entry.id, field.name, event.target.value)
                }
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={field.placeholder}
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
