'use client';

import { useMemo, useState } from 'react';
import FlightCardPanel from './FlightCardPanel';
import AccommodationCardPanel from './AccommodationCardPanel';
import DayCardPanel from './DayCardPanel';
import { applyCardFieldUpdates } from '@/lib/itinerary';

function MissingCardNotice({ label }) {
  return (
    <div className="border border-dashed border-neutral-700 rounded-xl px-4 py-6 text-sm text-neutral-400 text-center">
      {label} card missing. Recreate the itinerary to regenerate default cards.
    </div>
  );
}

export default function TripBuilderClient({ tripId, initialCards }) {
  const [cards, setCards] = useState(
    initialCards.map((card) => ({ ...card, isDirty: false }))
  );
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
      setCards(nextCards.map((card) => ({ ...card, isDirty: false })));
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
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
        <header>
          <h2 className="text-lg font-semibold">Flights</h2>
          <p className="text-sm text-neutral-400">
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

      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
        <header>
          <h2 className="text-lg font-semibold">Accommodation</h2>
          <p className="text-sm text-neutral-400">
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

      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
        <header>
          <h2 className="text-lg font-semibold">Daily highlights</h2>
          <p className="text-sm text-neutral-400">
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

      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Save trip</h2>
            <p className="text-sm text-neutral-400">
              Review each section, then save once. Travellers will see the
              updated details instantly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasDirty}
            className={`inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
              saving || !hasDirty
                ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-neutral-900'
            }`}
          >
            {saving ? 'Saving…' : 'Save trip'}
          </button>
        </header>
        {feedback.message ? (
          <div
            className={`text-sm rounded-xl px-3 py-2 border ${
              feedback.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : feedback.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-300'
            }`}
          >
            {feedback.message}
          </div>
        ) : (
          <p className="text-[11px] text-neutral-500">
            {hasDirty
              ? 'Unsaved changes pending.'
              : 'All sections are up to date.'}
          </p>
        )}
      </section>
    </div>
  );
}
