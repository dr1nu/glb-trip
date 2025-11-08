import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getTrip, updateTrip } from '@/lib/db';
import { applyCardFieldUpdates, normalizeFieldUpdates } from '@/lib/itinerary';

export async function PATCH(request, context) {
  const params = context?.params ?? {};
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
  if (!cardsInput) {
    return NextResponse.json(
      { error: 'cards array is required.' },
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

    if (cardsMap.size === 0) {
      return NextResponse.json(
        { error: 'No valid card updates provided.' },
        { status: 400 }
      );
    }

    const nextCards = trip.itinerary.cards.map((card) => {
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
    });

    const updated = await updateTrip(tripId, {
      itinerary: {
        ...trip.itinerary,
        updatedAt: new Date().toISOString(),
        cards: nextCards,
      },
    });

    if (!updated?.itinerary?.cards) {
      return NextResponse.json(
        { error: 'Failed to update itinerary.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { cards: updated.itinerary.cards },
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

const TIMELINE_FIELDS = {
  transport: ['title', 'time', 'price', 'link', 'description'],
  attraction: ['title', 'time', 'price', 'link', 'description'],
  food: ['title', 'name', 'description'],
};

function sanitizeTimeline(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => normalizeTimelineItem(item))
    .filter(Boolean);
}

function normalizeTimelineItem(item) {
  if (typeof item !== 'object' || item === null) return null;
  const type = item.type;
  if (!Object.prototype.hasOwnProperty.call(TIMELINE_FIELDS, type)) {
    return null;
  }

  const id =
    typeof item.id === 'string' && item.id.trim()
      ? item.id.trim()
      : crypto.randomUUID();

  const fields = {};
  for (const key of TIMELINE_FIELDS[type]) {
    const value = item.fields?.[key];
    fields[key] = typeof value === 'string' ? value.trim() : '';
  }

  return { id, type, fields };
}
