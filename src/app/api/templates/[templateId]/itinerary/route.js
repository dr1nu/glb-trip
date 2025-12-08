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
  if (!cardsInput) {
    return NextResponse.json(
      { error: 'cards array is required.' },
      { status: 400 }
    );
  }

  try {
    const template = await getTemplate(templateId);
    const templateDayCards = Array.isArray(template?.itinerary?.cards)
      ? template.itinerary.cards.filter((card) => card?.type === 'day')
      : [];
    if (!templateDayCards.length) {
      return NextResponse.json(
        { error: 'Itinerary not found for template.' },
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

    const nextCards = templateDayCards.map((card) => {
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

    const updated = await updateTemplate(templateId, {
      itinerary: {
        ...template.itinerary,
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
