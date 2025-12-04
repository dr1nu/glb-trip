'use client';

import { useMemo, useState } from 'react';
import FlightCardPanel from './FlightCardPanel';
import AccommodationCardPanel from './AccommodationCardPanel';
import DayCardPanel from './DayCardPanel';
import DayTimelineBuilder from './DayTimelineBuilder';
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
  destinationCountry,
  tripLengthDays,
  templates = [],
}) {
  const [cards, setCards] = useState(() => prepareCards(initialCards));
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

  function serializeItineraryForTemplate() {
    return {
      cards: cards.map(({ isDirty, ...card }) => ({
        ...card,
      })),
      updatedAt: new Date().toISOString(),
    };
  }

  async function handleApplyTemplate() {
    if (!selectedTemplateId || applyingTemplate) return;
    setTemplateFeedback({ type: '', message: '' });
    setApplyingTemplate(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId }),
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

  const hasDirty = cards.some((card) => card.isDirty);

  async function handleSave() {
    if (saving || !hasDirty) return;
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const payload = {
        cards: cards
          .filter((card) => card.isDirty)
          .map(({ isDirty, ...card }) => ({
            id: card.id,
            fields: card.fields,
            ...(Array.isArray(card.timeline) ? { timeline: card.timeline } : {}),
          })),
      };

      if (payload.cards.length === 0) {
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

      const nextCards = Array.isArray(data?.cards) ? data.cards : [];
      setCards(prepareCards(nextCards, { resetDirty: true }));
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
      {templates?.length ? (
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
              {templates.length} available
            </span>
          </header>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="rounded-xl border border-orange-100 px-3 py-2 text-sm text-slate-900 bg-white min-w-[220px]"
            >
              <option value="">Choose a template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · {template.destinationCountry}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleApplyTemplate}
              disabled={!selectedTemplateId || applyingTemplate}
              className={`inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
                !selectedTemplateId || applyingTemplate
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
        </section>
      ) : null}

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
