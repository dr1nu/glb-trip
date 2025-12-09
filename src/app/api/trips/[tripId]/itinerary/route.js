import { NextResponse } from 'next/server';
import { getTrip, updateTrip } from '@/lib/db';
import {
  applyCardFieldUpdates,
  normalizeFieldUpdates,
  sanitizeTimeline,
} from '@/lib/itinerary';

export async function PATCH(request, context) {
  const params = context?.params ? await context.params : {};
  const tripId = params.tripId ?? extractTripIdFromUrl(request.url);

  if (!tripId) {
    return NextResponse.json(
      { error: 'Trip identifier is required.' },
      { status: 400 }
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload.' },
      { status: 400 }
    );
  }

  const cardsInput = Array.isArray(payload?.cards) ? payload.cards : null;
  const unassignedInput = Array.isArray(payload?.unassignedActivities)
    ? payload.unassignedActivities
    : null;
  if (!cardsInput && !unassignedInput) {
    return NextResponse.json(
      { error: 'cards or unassignedActivities are required.' },
      { status: 400 }
    );
  }

  try {
    const trip = await getTrip(tripId);
    if (!trip?.itinerary?.cards?.length) {
      return NextResponse.json(
        { error: 'Itinerary not found for trip.' },
        { status: 404 }
      );
    }

    const cardsMap = new Map();
    if (cardsInput) {
      for (const item of cardsInput) {
        if (item && typeof item.id === 'string') {
          const normalizedFields = normalizeFieldUpdates(item.fields ?? {});
          const update = {};
          if (Object.keys(normalizedFields).length > 0) {
            update.fields = normalizedFields;
          }
          if (Array.isArray(item.timeline)) {
            update.timeline = sanitizeTimeline(item.timeline);
          }
          if (Object.keys(update).length > 0) {
            cardsMap.set(item.id, update);
          }
        }
      }
    }

    const hasCardUpdates = cardsMap.size > 0;
    const hasUnassignedUpdates = Array.isArray(unassignedInput);
    if (!hasCardUpdates && !hasUnassignedUpdates) {
      return NextResponse.json(
        { error: 'No valid updates provided.' },
        { status: 400 }
      );
    }

    const nextCards = hasCardUpdates
      ? trip.itinerary.cards.map((card) => {
          if (!cardsMap.has(card.id)) return card;
          const updates = cardsMap.get(card.id);
          let nextCard = card;
          if (updates.fields) {
            nextCard = applyCardFieldUpdates(nextCard, updates.fields);
          }
          if (Object.prototype.hasOwnProperty.call(updates, 'timeline')) {
            nextCard = {
              ...nextCard,
              timeline: updates.timeline,
            };
          }
          return nextCard;
        })
      : trip.itinerary.cards;

    const nextUnassigned = hasUnassignedUpdates
      ? sanitizeTimeline(unassignedInput)
      : sanitizeTimeline(trip.itinerary.unassignedActivities);

    const updated = await updateTrip(tripId, {
      itinerary: {
        ...trip.itinerary,
        updatedAt: new Date().toISOString(),
        cards: nextCards,
        unassignedActivities: nextUnassigned,
      },
      published: true,
    });

    if (!updated?.itinerary) {
      return NextResponse.json(
        { error: 'Failed to update itinerary.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        cards: updated.itinerary.cards ?? [],
        unassignedActivities: sanitizeTimeline(updated.itinerary.unassignedActivities),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Failed to update itinerary', err);
    return NextResponse.json(
      { error: 'Failed to update itinerary.' },
      { status: 500 }
    );
  }
}

function extractTripIdFromUrl(url) {
  try {
    const { pathname } = new URL(url, 'http://localhost');
    const parts = pathname.split('/').filter(Boolean);
    const tripIndex = parts.indexOf('trips');
    if (tripIndex === -1 || tripIndex + 1 >= parts.length) {
      return null;
    }
    return parts[tripIndex + 1] ?? null;
  } catch {
    return null;
  }
}
