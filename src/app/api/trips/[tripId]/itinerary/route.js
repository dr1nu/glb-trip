import { NextResponse } from 'next/server';
import { getTrip, updateTrip } from '@/lib/db';
import { sendTripPublishedEmail } from '@/lib/email';
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
  const cardOrderInput = Array.isArray(payload?.cardOrder) ? payload.cardOrder : null;
  const deletedCardIdsInput = Array.isArray(payload?.deletedCardIds)
    ? payload.deletedCardIds
    : null;
  const publishInput =
    typeof payload?.publish === 'boolean' ? payload.publish : null;
  if (
    !cardsInput &&
    !unassignedInput &&
    !cardOrderInput &&
    !deletedCardIdsInput &&
    publishInput === null
  ) {
    return NextResponse.json(
      { error: 'cards, cardOrder, or unassignedActivities are required.' },
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

    const existingIds = new Set(trip.itinerary.cards.map((card) => card.id));
    const cardsMap = new Map();
    const newCards = [];
    if (cardsInput) {
      for (const item of cardsInput) {
        if (!item || typeof item.id !== 'string') continue;
        const normalizedFields = normalizeFieldUpdates(item.fields ?? {});
        if (existingIds.has(item.id)) {
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
          continue;
        }

        if (item.type !== 'accommodation' && item.type !== 'day') continue;
        if (item.type === 'accommodation') {
          newCards.push({
            id: item.id,
            type: item.type,
            title: typeof item.title === 'string' ? item.title : 'Accommodation',
            subtitle: typeof item.subtitle === 'string' ? item.subtitle : 'Awaiting selection',
            summary:
              typeof item.summary === 'string'
                ? item.summary
                : 'Choose ideal hotel or apartment.',
            priceLabel: typeof item.priceLabel === 'string' ? item.priceLabel : '',
            fields: normalizedFields,
            notes: typeof item.notes === 'string' ? item.notes : '',
          });
          continue;
        }
        newCards.push({
          id: item.id,
          type: item.type,
          title: typeof item.title === 'string' ? item.title : 'Day',
          subtitle: typeof item.subtitle === 'string' ? item.subtitle : 'Destination',
          summary:
            typeof item.summary === 'string'
              ? item.summary
              : 'Plan headline experiences, dining, and downtime.',
          priceLabel: typeof item.priceLabel === 'string' ? item.priceLabel : '',
          fields: normalizedFields,
          timeline: Array.isArray(item.timeline)
            ? sanitizeTimeline(item.timeline)
            : [],
          notes: typeof item.notes === 'string' ? item.notes : '',
        });
      }
    }

    const deleteIds = Array.isArray(deletedCardIdsInput)
      ? deletedCardIdsInput.filter((id) => typeof id === 'string' && id.trim())
      : [];
    const deleteIdSet = new Set(deleteIds);
    const hasCardUpdates = cardsMap.size > 0 || newCards.length > 0 || deleteIdSet.size > 0;
    const hasUnassignedUpdates = Array.isArray(unassignedInput);
    const hasOrderUpdates = Array.isArray(cardOrderInput) && cardOrderInput.length > 0;
    if (!hasCardUpdates && !hasUnassignedUpdates && !hasOrderUpdates && publishInput === null) {
      return NextResponse.json(
        { error: 'No valid updates provided.' },
        { status: 400 }
      );
    }

    let nextCards = cardsMap.size > 0
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
    if (newCards.length > 0) {
      nextCards = [...nextCards, ...newCards];
    }
    if (deleteIdSet.size > 0) {
      nextCards = nextCards.filter(
        (card) => !(deleteIdSet.has(card.id) && card.type === 'accommodation')
      );
    }

    if (hasOrderUpdates) {
      const orderIds = cardOrderInput
        .filter((id) => typeof id === 'string' && id.trim())
        .map((id) => id.trim());
      const uniqueOrderIds = Array.from(new Set(orderIds));
      if (uniqueOrderIds.some((id) => deleteIdSet.has(id))) {
        return NextResponse.json(
          { error: 'cardOrder cannot include deleted card IDs.' },
          { status: 400 }
        );
      }
      if (uniqueOrderIds.length !== nextCards.length) {
        return NextResponse.json(
          { error: 'cardOrder must include every itinerary card exactly once.' },
          { status: 400 }
        );
      }
      const cardMap = new Map(nextCards.map((card) => [card.id, card]));
      if (!uniqueOrderIds.every((id) => cardMap.has(id))) {
        return NextResponse.json(
          { error: 'cardOrder includes unknown card IDs.' },
          { status: 400 }
        );
      }
      nextCards = uniqueOrderIds.map((id) => cardMap.get(id));
    }

    const nextUnassigned = hasUnassignedUpdates
      ? sanitizeTimeline(unassignedInput)
      : sanitizeTimeline(trip.itinerary.unassignedActivities);

    if (publishInput === true) {
      const publishError = validatePublishRequirements(trip, nextCards, nextUnassigned);
      if (publishError) {
        return NextResponse.json({ error: publishError }, { status: 400 });
      }
    }

    const shouldSendPublishEmail = publishInput === true && !trip.published;
    const updated = await updateTrip(tripId, {
      itinerary: {
        ...trip.itinerary,
        updatedAt: new Date().toISOString(),
        cards: nextCards,
        unassignedActivities: nextUnassigned,
      },
      published: publishInput === null ? trip.published : publishInput,
    });

    if (!updated?.itinerary) {
      return NextResponse.json(
        { error: 'Failed to update itinerary.' },
        { status: 500 }
      );
    }

    if (shouldSendPublishEmail) {
      try {
        await sendTripPublishedEmail({ trip: updated, request });
      } catch (emailError) {
        console.error('Failed to send trip published email', emailError);
      }
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

function validatePublishRequirements(trip, cards, unassignedActivities) {
  const issues = [];

  const imagePath =
    typeof trip?.imagePath === 'string' ? trip.imagePath.trim() : '';
  if (!imagePath) {
    issues.push('set a trip image');
  }

  const flightCards = Array.isArray(cards)
    ? cards.filter((card) => card?.type === 'departure' || card?.type === 'return')
    : [];
  const missingFlightLinks = flightCards
    .filter((card) => isBlank(card?.fields?.bookingLink))
    .map((card) => (card?.type === 'return' ? 'return flight' : 'departure flight'));
  if (missingFlightLinks.length > 0) {
    const unique = Array.from(new Set(missingFlightLinks));
    issues.push(`add booking links for ${unique.join(' and ')}`);
  }

  const accommodationCards = Array.isArray(cards)
    ? cards.filter((card) => card?.type === 'accommodation')
    : [];
  const hasAccommodationLink = accommodationCards.some(
    (card) => !isBlank(card?.fields?.bookingLink)
  );
  if (!hasAccommodationLink) {
    issues.push('add a booking link for accommodation');
  }

  const timelineItems = [];
  if (Array.isArray(cards)) {
    for (const card of cards) {
      if (card?.type !== 'day') continue;
      timelineItems.push(...sanitizeTimeline(card.timeline));
    }
  }
  timelineItems.push(...sanitizeTimeline(unassignedActivities));

  let missingTimelineCount = 0;
  for (const item of timelineItems) {
    const title = typeof item?.fields?.title === 'string' ? item.fields.title.trim() : '';
    const time = typeof item?.fields?.time === 'string' ? item.fields.time.trim() : '';
    if (!title || !time) missingTimelineCount += 1;
  }
  if (missingTimelineCount > 0) {
    issues.push(
      `add title and time for ${missingTimelineCount} timeline ${
        missingTimelineCount === 1 ? 'item' : 'items'
      }`
    );
  }

  if (issues.length === 0) return null;
  return `Trip cannot be published yet: ${issues.join('; ')}.`;
}

function isBlank(value) {
  return typeof value !== 'string' || value.trim().length === 0;
}
