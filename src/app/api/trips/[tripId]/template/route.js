import { NextResponse } from 'next/server';
import { getTrip, updateTrip } from '@/lib/db';
import { getTemplate } from '@/lib/templates';
import { sanitizeTimeline } from '@/lib/itinerary';

export const dynamic = 'force-dynamic';

export async function POST(request, context) {
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

  const templateId =
    typeof payload?.templateId === 'string' && payload.templateId.trim()
      ? payload.templateId.trim()
      : null;
  const dayIds =
    Array.isArray(payload?.dayIds) && payload.dayIds.length > 0
      ? payload.dayIds.filter((id) => typeof id === 'string' && id.trim())
      : [];
  if (!templateId) {
    return NextResponse.json(
      { error: 'templateId is required.' },
      { status: 400 }
    );
  }

  try {
    const [trip, template] = await Promise.all([
      getTrip(tripId),
      getTemplate(templateId),
    ]);

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }
    const templateDayCards = Array.isArray(template?.itinerary?.cards)
      ? template.itinerary.cards.filter((card) => card?.type === 'day')
      : [];
    const templateUnassigned = sanitizeTimeline(template?.itinerary?.unassignedActivities);
    if (!templateDayCards.length) {
      return NextResponse.json(
        { error: 'Template does not contain day cards to apply.' },
        { status: 400 }
      );
    }

    const selectedDayCards = dayIds.length
      ? templateDayCards.filter((card) => dayIds.includes(card.id))
      : templateDayCards;

    const tripCards = Array.isArray(trip.itinerary?.cards)
      ? [...trip.itinerary.cards]
      : [];
    const tripDayIndices = tripCards
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card?.type === 'day');

    if (tripDayIndices.length === 0) {
      return NextResponse.json(
        { error: 'Trip does not have day cards to update.' },
        { status: 400 }
      );
    }

    const replaceCount = Math.min(selectedDayCards.length, tripDayIndices.length);
    if (replaceCount === 0) {
      return NextResponse.json(
        { error: 'No day cards selected to apply.' },
        { status: 400 }
      );
    }

    for (let i = 0; i < replaceCount; i += 1) {
      const target = tripDayIndices[i];
      const templateCard = selectedDayCards[i];
      const merged = {
        ...target.card,
        ...templateCard,
        id: target.card.id,
        timeline: sanitizeTimeline(templateCard.timeline),
      };
      tripCards[target.index] = merged;
    }

    const updated = await updateTrip(tripId, {
      itinerary: {
        ...trip.itinerary,
        updatedAt: new Date().toISOString(),
        cards: tripCards,
        unassignedActivities: templateUnassigned,
      },
      published: false,
    });

    if (!updated?.itinerary?.cards) {
      return NextResponse.json(
        { error: 'Failed to apply template.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        tripId,
        templateId,
        itinerary: updated.itinerary,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Failed to apply template to trip', err);
    return NextResponse.json(
      { error: 'Failed to apply template.' },
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
