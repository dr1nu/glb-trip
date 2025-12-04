import { NextResponse } from 'next/server';
import { getTrip } from '@/lib/db';
import { buildDefaultItinerary } from '@/lib/itinerary';
import { createTemplate, listTemplates } from '@/lib/templates';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const destinationCountry =
    searchParams.get('destinationCountry') ?? searchParams.get('destination');

  try {
    const templates = await listTemplates({
      destinationCountry: destinationCountry || undefined,
    });
    return NextResponse.json({ templates });
  } catch (err) {
    console.error('Failed to list templates', err);
    return NextResponse.json(
      { error: 'Failed to load templates.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload.' },
      { status: 400 }
    );
  }

  try {
    const { name, destinationCountry } = payload ?? {};
    const tripLengthDays = normaliseInt(payload?.tripLengthDays);
    const notes =
      typeof payload?.notes === 'string' && payload.notes.trim()
        ? payload.notes.trim()
        : null;
    const sourceTripId =
      typeof payload?.sourceTripId === 'string' && payload.sourceTripId.trim()
        ? payload.sourceTripId.trim()
        : null;

    if (!name || typeof name !== 'string') {
      throw new Error('Template name is required.');
    }
    if (!destinationCountry || typeof destinationCountry !== 'string') {
      throw new Error('Template destinationCountry is required.');
    }

    let itinerary = normalizeItinerary(payload?.itinerary);
    let resolvedTripLength = tripLengthDays;

    if (!itinerary && sourceTripId) {
      const trip = await getTrip(sourceTripId);
      if (!trip?.itinerary?.cards?.length) {
        throw new Error('Source trip does not have an itinerary to copy.');
      }
      itinerary = trip.itinerary;
      resolvedTripLength = resolvedTripLength || trip.tripLengthDays;
    }

    if (!itinerary) {
      itinerary = buildDefaultItinerary({
        tripLengthDays: resolvedTripLength || 3,
        destinationCountry,
      });
    }

    const template = await createTemplate({
      name,
      destinationCountry,
      tripLengthDays:
        resolvedTripLength || countDayCards(itinerary) || itinerary?.cards?.length || null,
      sourceTripId,
      itinerary,
      notes,
    });

    return NextResponse.json({ template });
  } catch (err) {
    console.error('Failed to create template', err);
    const message = err instanceof Error ? err.message : 'Unable to create template.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function normaliseInt(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : null;
}

function normalizeItinerary(itinerary) {
  if (typeof itinerary !== 'object' || itinerary === null) return null;
  if (!Array.isArray(itinerary.cards)) return null;
  return {
    ...itinerary,
    cards: itinerary.cards,
  };
}

function countDayCards(itinerary) {
  if (!Array.isArray(itinerary?.cards)) return null;
  const count = itinerary.cards.filter((card) => card?.type === 'day').length;
  return count > 0 ? count : null;
}
