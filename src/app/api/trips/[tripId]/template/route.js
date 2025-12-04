import { NextResponse } from 'next/server';
import { getTrip, updateTrip } from '@/lib/db';
import { getTemplate } from '@/lib/templates';

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
    if (!template?.itinerary?.cards?.length) {
      return NextResponse.json(
        { error: 'Template does not contain an itinerary.' },
        { status: 400 }
      );
    }

    const updated = await updateTrip(tripId, {
      itinerary: {
        ...template.itinerary,
        updatedAt: new Date().toISOString(),
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
