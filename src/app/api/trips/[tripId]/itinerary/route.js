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
        cardsMap.set(item.id, normalizeFieldUpdates(item.fields ?? {}));
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
      return applyCardFieldUpdates(card, cardsMap.get(card.id));
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
