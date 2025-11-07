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
    const fieldUpdates = normalizeFieldUpdates(payload);
    if (Object.keys(fieldUpdates).length === 0) {
      return NextResponse.json({ card }, { status: 200 });
    }

    const updatedCard = applyCardFieldUpdates(card, fieldUpdates);

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
