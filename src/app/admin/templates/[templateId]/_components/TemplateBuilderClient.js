'use client';

import { useMemo, useState } from 'react';
import FlightCardPanel from '@/app/trip/[tripId]/builder/_components/FlightCardPanel';
import AccommodationCardPanel from '@/app/trip/[tripId]/builder/_components/AccommodationCardPanel';
import DayCardPanel from '@/app/trip/[tripId]/builder/_components/DayCardPanel';
import DayTimelineBuilder from '@/app/trip/[tripId]/builder/_components/DayTimelineBuilder';
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

export default function TemplateBuilderClient({ templateId, initialCards }) {
  const [cards, setCards] = useState(() => prepareCards(initialCards));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

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

      const nextCards = Array.isArray(data?.cards) ? data.cards : [];
      setCards(prepareCards(nextCards, { resetDirty: true }));
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
            Capture stay details so travel specialists can reuse this plan quickly.
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
