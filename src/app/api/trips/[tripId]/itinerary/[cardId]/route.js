import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getTrip, updateTrip } from '@/lib/db';
import {
  applyCardFieldUpdates,
  normalizeFieldUpdates,
} from '@/lib/itinerary';

export async function PATCH(request, context) {
  const params = context?.params ?? {};
  const tripId = params.tripId;
  const cardId = params.cardId;

  if (!tripId || !cardId) {
    return NextResponse.json(
      { error: 'Trip and card identifiers are required.' },
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

  if (typeof payload !== 'object' || payload === null) {
    return NextResponse.json(
      { error: 'Body must be an object.' },
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

    const cards = [...trip.itinerary.cards];
    const idx = cards.findIndex((card) => card.id === cardId);
    if (idx === -1) {
      return NextResponse.json(
        { error: 'Card not found in itinerary.' },
        { status: 404 }
      );
    }

    const card = cards[idx];
    const {
      timeline: timelineInput = undefined,
      fields: explicitFields,
      ...rest
    } = payload;

    const fieldPayload =
      explicitFields && typeof explicitFields === 'object'
        ? explicitFields
        : rest;

    const fieldUpdates = normalizeFieldUpdates(fieldPayload);

    let updatedCard = card;

    if (Object.keys(fieldUpdates).length > 0) {
      updatedCard = applyCardFieldUpdates(updatedCard, fieldUpdates);
    }

    const hasTimelineUpdate = Array.isArray(timelineInput);
    if (hasTimelineUpdate) {
      updatedCard = {
        ...updatedCard,
        timeline: sanitizeTimeline(timelineInput),
      };
    }

    if (updatedCard === card) {
      return NextResponse.json({ card }, { status: 200 });
    }

    cards[idx] = updatedCard;

    const updated = await updateTrip(tripId, {
      itinerary: {
        ...trip.itinerary,
        updatedAt: new Date().toISOString(),
        cards,
      },
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update itinerary.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { card: updatedCard },
      { status: 200 }
    );
  } catch (err) {
    console.error('Failed to update itinerary card', err);
    return NextResponse.json(
      { error: 'Failed to update itinerary card.' },
      { status: 500 }
    );
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
