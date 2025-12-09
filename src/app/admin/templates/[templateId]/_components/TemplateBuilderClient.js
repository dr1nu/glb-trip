'use client';

import { useMemo, useState } from 'react';
import DayCardPanel from '@/app/trip/[tripId]/builder/_components/DayCardPanel';
import DayTimelineBuilder, {
  TIMELINE_TYPE_OPTIONS,
  TypeIcon,
} from '@/app/trip/[tripId]/builder/_components/DayTimelineBuilder';
import { applyCardFieldUpdates } from '@/lib/itinerary';

function hasContent(value) {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value != null;
}

function extractStayLength(summary) {
  if (typeof summary !== 'string') return '';
  const match = summary.match(/(\d+\s+night[s]?)/i);
  return match ? match[1] : '';
}

function hydrateCardFields(card) {
  if (!card) {
    return { card, mutated: false };
  }

  const nextFields = {
    ...(card.fields ?? {}),
  };
  let mutated = false;

  const ensureField = (key, fallback) => {
    if (!hasContent(nextFields[key]) && hasContent(fallback)) {
      nextFields[key] = fallback;
      mutated = true;
    }
  };

  if (card.type === 'departure' || card.type === 'return') {
    ensureField('homeAirport', card.airports?.from);
    ensureField('arrivalAirport', card.airports?.to);
    ensureField('price', card.priceLabel);
  } else if (card.type === 'accommodation') {
    ensureField('price', card.priceLabel);
    ensureField('lengthOfStay', extractStayLength(card.summary));
  } else if (card.type === 'day') {
    ensureField('city', card.subtitle);
    ensureField('dailyCost', card.priceLabel);
    ensureField('highlightAttraction', card.summary);
  }

  if (!mutated) {
    return { card, mutated };
  }

  return {
    card: {
      ...card,
      fields: nextFields,
    },
    mutated,
  };
}

function prepareCards(rawCards, { resetDirty = false } = {}) {
  return (rawCards ?? [])
    .filter((card) => card?.type === 'day')
    .map((card) => {
      const { card: hydratedCard, mutated } = hydrateCardFields(card);
      return {
        ...hydratedCard,
        isDirty: resetDirty ? false : Boolean(card.isDirty) || mutated,
      };
    });
}

function normalizeActivity(activity = {}) {
  const globalCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
  const id =
    typeof activity.id === 'string' && activity.id.trim()
      ? activity.id.trim()
      : globalCrypto?.randomUUID?.() ?? `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const type =
    typeof activity.type === 'string' && activity.type.trim()
      ? activity.type.trim()
      : 'attraction';
  const defaultFields = {
    title: '',
    description: '',
    time: '',
    price: '',
    link: '',
  };
  return {
    id,
    type,
    fields: {
      ...defaultFields,
      ...(activity.fields ?? {}),
    },
  };
}

function prepareActivities(raw = [], { resetDirty = false } = {}) {
  return (raw ?? []).map((activity) => {
    const normalized = normalizeActivity(activity);
    return {
      ...normalized,
      isDirty: resetDirty ? false : Boolean(activity.isDirty),
    };
  });
}

function MissingCardNotice({ label }) {
  return (
    <div className="border border-dashed border-orange-100 rounded-xl px-4 py-6 text-sm text-[#4C5A6B] text-center">
      {label} card missing. Recreate the itinerary to regenerate default cards.
    </div>
  );
}

function ActivityCard({ activity, onChange, onDelete }) {
  const fields = activity.fields ?? {};
  return (
    <article className="bg-gradient-to-b from-[#FFF4EB] via-white to-[#FFF9F4] border border-orange-100 rounded-2xl p-4 space-y-4">
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
              Template pool · {activity.isDirty ? 'Unsaved edits' : 'Saved'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(activity.id)}
          className="text-xs text-[#4C5A6B] hover:text-red-400"
        >
          Remove
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[#4C5A6B]">Type</span>
          <select
            value={activity.type}
            onChange={(event) => onChange(activity.id, 'type', event.target.value)}
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
            onChange={(event) => onChange(activity.id, 'title', event.target.value)}
            placeholder="Sunset cruise or backup museum"
            className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[#4C5A6B]">Description</span>
          <textarea
            rows={3}
            value={fields.description ?? ''}
            onChange={(event) => onChange(activity.id, 'description', event.target.value)}
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
              onChange={(event) => onChange(activity.id, 'time', event.target.value)}
              placeholder="e.g. 18:00 or Afternoon"
              className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[#4C5A6B]">Badge or price</span>
            <input
              type="text"
              value={fields.price ?? ''}
              onChange={(event) => onChange(activity.id, 'price', event.target.value)}
              placeholder="Free or €25"
              className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-[#4C5A6B]">Link</span>
            <input
              type="text"
              value={fields.link ?? ''}
              onChange={(event) => onChange(activity.id, 'link', event.target.value)}
              placeholder="https://experience.com"
              className="bg-white border border-orange-100 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </label>
        </div>
      </div>
    </article>
  );
}

export default function TemplateBuilderClient({
  templateId,
  initialCards,
  initialActivities = [],
}) {
  const [cards, setCards] = useState(() => prepareCards(initialCards));
  const [activities, setActivities] = useState(() => prepareActivities(initialActivities));
  const [activitiesEdited, setActivitiesEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const dayCards = useMemo(
    () => cards.filter((card) => card.type === 'day'),
    [cards]
  );

  function handleFieldChange(cardId, fieldUpdates) {
    setFeedback({ type: '', message: '' });
    setCards((prev) =>
      prev.map((card) => {
        if (card.id !== cardId) return card;
        const updatedCard = applyCardFieldUpdates(card, fieldUpdates);
        return { ...updatedCard, isDirty: true };
      })
    );
  }

  function handleTimelineChange(cardId, nextTimeline) {
    setFeedback({ type: '', message: '' });
    setCards((prev) =>
      prev.map((card) => {
        if (card.id !== cardId) return card;
        return {
          ...card,
          timeline: Array.isArray(nextTimeline) ? nextTimeline : [],
          isDirty: true,
        };
      })
    );
  }

  function handleActivityChange(activityId, field, value) {
    setFeedback({ type: '', message: '' });
    setActivitiesEdited(true);
    setActivities((prev) =>
      prev.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              fields: {
                ...(activity.fields ?? {}),
                [field]: value,
              },
              isDirty: true,
            }
          : activity
      )
    );
  }

  function handleAddActivity() {
    setFeedback({ type: '', message: '' });
    const next = normalizeActivity({});
    setActivitiesEdited(true);
    setActivities((prev) => [{ ...next, isDirty: true }, ...prev]);
  }

  function handleDeleteActivity(activityId) {
    setFeedback({ type: '', message: '' });
    setActivitiesEdited(true);
    setActivities((prev) => {
      const next = prev.filter((activity) => activity.id !== activityId);
      if (next.length === prev.length) return prev;
      return next.map((activity) => ({ ...activity, isDirty: true }));
    });
  }

  const hasDirtyCards = cards.some((card) => card.isDirty);
  const hasDirtyActivities = activitiesEdited || activities.some((activity) => activity.isDirty);
  const hasDirty = hasDirtyCards || hasDirtyActivities;

  async function handleSave() {
    if (saving || !hasDirty) return;
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const dirtyCards = cards
        .filter((card) => card.isDirty)
        .map(({ isDirty, ...card }) => ({
          id: card.id,
          fields: card.fields,
          ...(Array.isArray(card.timeline) ? { timeline: card.timeline } : {}),
        }));

      const payload = {};
      if (dirtyCards.length > 0) {
        payload.cards = dirtyCards;
      }
      if (hasDirtyActivities) {
        payload.unassignedActivities = activities.map(({ isDirty, ...activity }) => activity);
      }

      if (!payload.cards && !payload.unassignedActivities) {
        setFeedback({
          type: 'info',
          message: 'No changes to save.',
        });
        return;
      }

      const response = await fetch(`/api/templates/${templateId}/itinerary`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof data?.error === 'string'
            ? data.error
            : `Failed with status ${response.status}.`;
        throw new Error(message);
      }

      const nextCards = Array.isArray(data?.cards) ? data.cards : cards;
      const nextActivities = Array.isArray(data?.unassignedActivities)
        ? data.unassignedActivities
        : activities;
      setCards(prepareCards(nextCards, { resetDirty: true }));
      setActivities(prepareActivities(nextActivities, { resetDirty: true }));
      setActivitiesEdited(false);
      setFeedback({ type: 'success', message: 'Template saved.' });
    } catch (err) {
      console.error('Failed to save template', err);
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to save template.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-orange-100 rounded-2xl p-6 space-y-5">
        <header>
          <h2 className="text-lg font-semibold">Daily highlights</h2>
          <p className="text-sm text-[#4C5A6B]">
            Outline each day&apos;s location, must-see experience, and costs.
          </p>
        </header>
        <div className="space-y-4">
          {dayCards.length > 0 ? (
            dayCards.map((card) => (
              <DayCardPanel
                key={card.id}
                card={card}
                onFieldChange={handleFieldChange}
                isDirty={card.isDirty}
              />
            ))
          ) : (
            <MissingCardNotice label="Daily plans" />
          )}
        </div>
      </section>

      {dayCards.length > 0 ? (
        <DayTimelineBuilder
          dayCards={dayCards}
          onTimelineChange={handleTimelineChange}
        />
      ) : null}

      <section className="bg-white border border-orange-100 rounded-2xl p-6 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Unassigned activities</h2>
            <p className="text-sm text-[#4C5A6B]">
              Keep optional ideas here. Trip builders can drop them into a day or leave them in the
              &ldquo;Other Activities&rdquo; tab for travellers.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddActivity}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl transition-colors bg-orange-500 hover:bg-orange-600 text-neutral-900"
          >
            Add activity
          </button>
        </header>
        <div className="space-y-3">
          {activities.length ? (
            activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onChange={handleActivityChange}
                onDelete={handleDeleteActivity}
              />
            ))
          ) : (
            <div className="border border-dashed border-orange-100 rounded-xl px-4 py-6 text-sm text-[#4C5A6B] text-center">
              No unassigned activities yet. Use this area for overflow ideas, backups, or rainy-day
              plans.
            </div>
          )}
        </div>
      </section>

      <section className="bg-white border border-orange-100 rounded-2xl p-6 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Save template</h2>
            <p className="text-sm text-[#4C5A6B]">
              Review each section, then save once. Changes are ready to reuse instantly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasDirty}
            className={`inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
              saving || !hasDirty
                ? 'bg-orange-100 text-[#4C5A6B] cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-neutral-900'
            }`}
          >
            {saving ? 'Saving…' : 'Save template'}
          </button>
        </header>
        {feedback.message ? (
          <div
            className={`text-sm rounded-xl px-3 py-2 border ${
              feedback.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : feedback.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-orange-50 border-orange-100 text-[#4C5A6B]'
            }`}
          >
            {feedback.message}
          </div>
        ) : (
          <p className="text-[11px] text-[#4C5A6B]">
            {hasDirty
              ? 'Unsaved changes pending.'
              : 'All sections are up to date.'}
          </p>
        )}
      </section>
    </div>
  );
}
