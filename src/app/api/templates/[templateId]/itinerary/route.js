import { NextResponse } from 'next/server';
import {
  applyCardFieldUpdates,
  normalizeFieldUpdates,
  sanitizeTimeline,
} from '@/lib/itinerary';
import { getTemplate, updateTemplate } from '@/lib/templates';

export const dynamic = 'force-dynamic';

export async function PATCH(request, context) {
  const params = context?.params ? await context.params : {};
  const templateId = params.templateId ?? extractTemplateIdFromUrl(request.url);
  if (!templateId) {
    return NextResponse.json(
      { error: 'Template identifier is required.' },
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
    const template = await getTemplate(templateId);
    const templateDayCards = Array.isArray(template?.itinerary?.cards)
      ? template.itinerary.cards.filter((card) => card?.type === 'day')
      : [];
    if (!templateDayCards.length && cardsInput) {
      return NextResponse.json(
        { error: 'Itinerary not found for template.' },
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
      ? templateDayCards.map((card) => {
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
      : templateDayCards;

    const nextUnassigned = hasUnassignedUpdates
      ? sanitizeTimeline(unassignedInput)
      : sanitizeTimeline(template?.itinerary?.unassignedActivities);

    const updated = await updateTemplate(templateId, {
      itinerary: {
        ...template.itinerary,
        updatedAt: new Date().toISOString(),
        cards: nextCards,
        unassignedActivities: nextUnassigned,
      },
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
    console.error('Failed to update template itinerary', err);
    return NextResponse.json(
      { error: 'Failed to update template itinerary.' },
      { status: 500 }
    );
  }
}

function extractTemplateIdFromUrl(url) {
  try {
    const { pathname } = new URL(url, 'http://localhost');
    const parts = pathname.split('/').filter(Boolean);
    const templateIndex = parts.indexOf('templates');
    if (templateIndex === -1 || templateIndex + 1 >= parts.length) {
      return null;
    }
    return parts[templateIndex + 1] ?? null;
  } catch {
    return null;
  }
}
