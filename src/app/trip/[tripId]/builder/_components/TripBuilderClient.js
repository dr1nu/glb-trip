'use client';

import { useEffect, useMemo, useState } from 'react';
import FlightCardPanel from './FlightCardPanel';
import AccommodationCardPanel from './AccommodationCardPanel';
import DayCardPanel from './DayCardPanel';
import DayTimelineBuilder, { TIMELINE_TYPE_OPTIONS, TypeIcon } from './DayTimelineBuilder';
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
  return (rawCards ?? []).map((card) => {
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

export default function TripBuilderClient({
  tripId,
  initialCards,
  initialActivities = [],
  destinationCountry,
  tripLengthDays,
  templates = [],
}) {
  const [cards, setCards] = useState(() => prepareCards(initialCards));
  const [unassignedActivities, setUnassignedActivities] = useState(() =>
    prepareActivities(initialActivities)
  );
  const [activitiesEdited, setActivitiesEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [templateFeedback, setTemplateFeedback] = useState({ type: '', message: '' });
  const [templateSaveFeedback, setTemplateSaveFeedback] = useState({
    type: '',
    message: '',
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const departureCard = useMemo(
    () => cards.find((card) => card.id === 'departure-flight') ?? null,
    [cards]
  );
  const returnCard = useMemo(
    () => cards.find((card) => card.id === 'return-flight') ?? null,
    [cards]
  );
  const accommodationCard = useMemo(
    () => cards.find((card) => card.type === 'accommodation') ?? null,
    [cards]
  );
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

  function handleAssignActivity(activityId, dayId) {
    if (!activityId || !dayId) return;
    const activity = unassignedActivities.find((item) => item.id === activityId);
    if (!activity) return;
    setFeedback({ type: '', message: '' });
    setCards((prev) =>
      prev.map((card) => {
        if (card.id !== dayId) return card;
        const existingTimeline = Array.isArray(card.timeline) ? card.timeline : [];
        return {
          ...card,
          timeline: [...existingTimeline, { id: activity.id, type: activity.type, fields: activity.fields }],
          isDirty: true,
        };
      })
    );
    setUnassignedActivities((prev) => prev.filter((item) => item.id !== activityId));
    setActivitiesEdited(true);
  }

  function handleAddUnassigned() {
    setFeedback({ type: '', message: '' });
    const next = normalizeActivity({});
    setUnassignedActivities((prev) => [{ ...next, isDirty: true }, ...prev]);
    setActivitiesEdited(true);
  }

  function handleUnassignedChange(activityId, field, value) {
    setFeedback({ type: '', message: '' });
    setActivitiesEdited(true);
    setUnassignedActivities((prev) =>
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

  function handleUnassignedTypeChange(activityId, type) {
    setFeedback({ type: '', message: '' });
    setActivitiesEdited(true);
    setUnassignedActivities((prev) =>
      prev.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              type,
              isDirty: true,
            }
          : activity
      )
    );
  }

  function handleUnassignedDelete(activityId) {
    setFeedback({ type: '', message: '' });
    setActivitiesEdited(true);
    setUnassignedActivities((prev) => prev.filter((item) => item.id !== activityId));
  }

  function serializeItineraryForTemplate() {
    const dayCardsOnly = cards
      .filter((card) => card.type === 'day')
      .map(({ isDirty, ...card }) => ({
        ...card,
      }));
    return {
      cards: dayCardsOnly,
      unassignedActivities: unassignedActivities.map(({ isDirty, ...activity }) => activity),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async function handleApplyTemplate() {
    if (!selectedTemplateId || applyingTemplate) return;
    setTemplateFeedback({ type: '', message: '' });
    setApplyingTemplate(true);
    try {
      const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
      const templateDayCards = Array.isArray(selectedTemplate?.itinerary?.cards)
        ? selectedTemplate.itinerary.cards.filter((card) => card?.type === 'day')
        : [];
      const tripDayCount = dayCards.length || tripLengthDays || 0;
      if (templateDayCards.length === 0) {
        throw new Error('Selected template has no day cards to apply.');
      }

      let dayIdsToApply = templateDayCards.map((card) => card.id);
      if (templateDayCards.length > tripDayCount && tripDayCount > 0) {
        const defaultSelection = templateDayCards
          .slice(0, tripDayCount)
          .map((_, index) => String(index + 1))
          .join(',');
        const labelList = templateDayCards
          .map((card, index) => `${index + 1}. ${card.title || `Day ${index + 1}`}`)
          .join('\n');
        const input = window.prompt(
          `Template has ${templateDayCards.length} days, but this trip has ${tripDayCount}. Enter the day numbers to import (comma-separated):\n${labelList}`,
          defaultSelection
        );
        if (input === null) {
          setApplyingTemplate(false);
          return;
        }
        const selections = input
          .split(/[,\\s]+/)
          .map((part) => Number(part))
          .filter((num) => Number.isFinite(num) && num >= 1 && num <= templateDayCards.length);
        const uniqueSelections = Array.from(new Set(selections));
        if (uniqueSelections.length === 0) {
          throw new Error('No valid day numbers selected.');
        }
        dayIdsToApply = uniqueSelections.map((dayNumber) => templateDayCards[dayNumber - 1].id);
      }

      const response = await fetch(`/api/trips/${tripId}/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId, dayIds: dayIdsToApply }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof data?.error === 'string'
            ? data.error
            : `Failed with status ${response.status}.`;
        throw new Error(message);
      }
      const nextCards = Array.isArray(data?.itinerary?.cards)
        ? data.itinerary.cards
        : [];
      if (nextCards.length === 0) {
        throw new Error('Template did not include any itinerary cards.');
      }
      setCards(prepareCards(nextCards, { resetDirty: true }));
      const nextActivities = Array.isArray(data?.itinerary?.unassignedActivities)
        ? data.itinerary.unassignedActivities
        : unassignedActivities;
      setUnassignedActivities(prepareActivities(nextActivities, { resetDirty: true }));
      setActivitiesEdited(false);
      setTemplateFeedback({ type: 'success', message: 'Template applied to this trip.' });
      setFeedback({ type: '', message: '' });
    } catch (err) {
      console.error('Failed to apply template', err);
      setTemplateFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to apply template.',
      });
    } finally {
      setApplyingTemplate(false);
    }
  }

  async function handleSaveAsTemplate() {
    if (savingTemplate) return;
    const suggestedName = destinationCountry
      ? `${destinationCountry} template`
      : 'Trip template';
    const name = window.prompt('Name this template', suggestedName);
    if (!name) return;

    setTemplateSaveFeedback({ type: '', message: '' });
    setSavingTemplate(true);
    try {
      const payload = {
        name: name.trim(),
        destinationCountry: destinationCountry || 'Template',
        tripLengthDays,
        sourceTripId: tripId,
        itinerary: serializeItineraryForTemplate(),
      };

      const response = await fetch('/api/templates', {
        method: 'POST',
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

      const templateId = data?.template?.id;
      setTemplateSaveFeedback({
        type: 'success',
        message: templateId
          ? `Saved as template (${templateId}).`
          : 'Saved as template.',
      });
    } catch (err) {
      console.error('Failed to save template', err);
      setTemplateSaveFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to save template.',
      });
    } finally {
      setSavingTemplate(false);
    }
  }

  const hasDirtyCards = cards.some((card) => card.isDirty);
  const hasDirtyActivities = activitiesEdited || unassignedActivities.some((item) => item.isDirty);
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
        payload.unassignedActivities = unassignedActivities.map(({ isDirty, ...activity }) => activity);
      }

      if (!payload.cards && !payload.unassignedActivities) {
        setFeedback({
          type: 'info',
          message: 'No changes to save.',
        });
        return;
      }

      const response = await fetch(`/api/trips/${tripId}/itinerary`, {
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
        : unassignedActivities;
      setCards(prepareCards(nextCards, { resetDirty: true }));
      setUnassignedActivities(prepareActivities(nextActivities, { resetDirty: true }));
      setActivitiesEdited(false);
      setFeedback({ type: 'success', message: 'Trip saved.' });
    } catch (err) {
      console.error('Failed to save itinerary', err);
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to save trip.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-orange-100 rounded-2xl p-6 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Load from template</h2>
            <p className="text-sm text-[#4C5A6B]">
              Prefill this builder with a saved plan for{' '}
              {destinationCountry || 'this destination'}.
            </p>
          </div>
          <span className="text-xs uppercase tracking-wide text-[#4C5A6B]">
            {templates?.length ? `${templates.length} available` : 'No templates yet'}
          </span>
        </header>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="rounded-xl border border-orange-100 px-3 py-2 text-sm text-slate-900 bg-white min-w-[220px]"
            disabled={!templates?.length}
          >
            <option value="">{templates?.length ? 'Choose a template' : 'No templates'}</option>
            {templates?.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.destinationCountry}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleApplyTemplate}
            disabled={!selectedTemplateId || applyingTemplate || !templates?.length}
            className={`inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
              !selectedTemplateId || applyingTemplate || !templates?.length
                ? 'bg-orange-100 text-[#4C5A6B] cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-neutral-900'
            }`}
          >
            {applyingTemplate ? 'Applying…' : 'Apply template'}
          </button>
        </div>
        {templateFeedback.message ? (
          <div
            className={`text-sm rounded-xl px-3 py-2 border ${
              templateFeedback.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : templateFeedback.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-orange-50 border-orange-100 text-[#4C5A6B]'
            }`}
          >
            {templateFeedback.message}
          </div>
        ) : null}
        {!templates?.length ? (
          <p className="text-xs text-[#4C5A6B]">
            Create a template in the admin area to enable importing into trips.
          </p>
        ) : null}
      </section>

      <section className="bg-white border border-orange-100 rounded-2xl p-6 space-y-5">
        <header>
          <h2 className="text-lg font-semibold">Flights</h2>
          <p className="text-sm text-[#4C5A6B]">
            Add confirmed timings, baggage info, and booking links for each leg.
          </p>
        </header>

        <div className="space-y-4">
          {departureCard ? (
            <FlightCardPanel
              card={departureCard}
              direction="departure"
              onFieldChange={handleFieldChange}
              isDirty={departureCard.isDirty}
            />
          ) : (
            <MissingCardNotice label="Departure flight" />
          )}
          {returnCard ? (
            <FlightCardPanel
              card={returnCard}
              direction="return"
              onFieldChange={handleFieldChange}
              isDirty={returnCard.isDirty}
            />
          ) : (
            <MissingCardNotice label="Return flight" />
          )}
        </div>
      </section>

      <section className="bg-white border border-orange-100 rounded-2xl p-6 space-y-5">
        <header>
          <h2 className="text-lg font-semibold">Accommodation</h2>
          <p className="text-sm text-[#4C5A6B]">
            Capture stay details so travellers know where they&apos;ll unwind.
          </p>
        </header>
        {accommodationCard ? (
          <AccommodationCardPanel
            card={accommodationCard}
            onFieldChange={handleFieldChange}
            isDirty={accommodationCard.isDirty}
          />
        ) : (
          <MissingCardNotice label="Accommodation" />
        )}
      </section>

      <section className="bg-white border border-orange-100 rounded-2xl p-6 space-y-5">
        <header>
          <h2 className="text-lg font-semibold">Daily highlights</h2>
          <p className="text-sm text-[#4C5A6B]">
            Outline each day&apos;s must-see experience and costs.
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

      <section className="bg-white border border-orange-100 rounded-2xl p-6 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Unassigned activities</h2>
            <p className="text-sm text-[#4C5A6B]">
              Optional ideas from templates. Assign them to a day or leave them for the
              traveller&apos;s &ldquo;Other Activities&rdquo; tab.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-[#4C5A6B]">
              {unassignedActivities.length
                ? `${unassignedActivities.length} in pool`
                : 'None yet'}
            </span>
            <button
              type="button"
              onClick={handleAddUnassigned}
              className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold rounded-xl transition-colors bg-orange-500 hover:bg-orange-600 text-neutral-900"
            >
              Add activity
            </button>
          </div>
        </header>
        <div className="space-y-3">
          {unassignedActivities.length ? (
            unassignedActivities.map((activity) => (
              <UnassignedActivityCard
                key={activity.id}
                activity={activity}
                dayCards={dayCards}
                onAssign={handleAssignActivity}
                onChange={handleUnassignedChange}
                onTypeChange={handleUnassignedTypeChange}
                onDelete={handleUnassignedDelete}
              />
            ))
          ) : (
            <div className="border border-dashed border-orange-100 rounded-xl px-4 py-6 text-sm text-[#4C5A6B] text-center">
              All optional activities are assigned. Anything left here will show in the Other
              Activities tab for travellers.
            </div>
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
            <h2 className="text-lg font-semibold">Save trip</h2>
            <p className="text-sm text-[#4C5A6B]">
              Review each section, then save once. Travellers will see the
              updated details instantly.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAsTemplate}
              disabled={savingTemplate}
              className={`inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl transition-colors border ${
                savingTemplate
                  ? 'bg-white text-[#4C5A6B] border-orange-100 cursor-not-allowed'
                  : 'bg-white text-slate-900 border-orange-200 hover:border-orange-300'
              }`}
            >
              {savingTemplate ? 'Saving…' : 'Save as template'}
            </button>
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
              {saving ? 'Saving…' : 'Save trip'}
            </button>
          </div>
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
        {templateSaveFeedback.message ? (
          <div
            className={`text-sm rounded-xl px-3 py-2 border ${
              templateSaveFeedback.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : templateSaveFeedback.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-orange-50 border-orange-100 text-[#4C5A6B]'
            }`}
          >
            {templateSaveFeedback.message}
          </div>
        ) : null}
      </section>
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
          onClick={() => onAssign(activity.id, dayId)}
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
