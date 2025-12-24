import { NextResponse } from 'next/server';
import { deleteTrip, getTrip, updateTrip } from '@/lib/db';
import { buildDefaultItinerary } from '@/lib/itinerary';
import { isAdminUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request, context) {
  const params = context?.params ? await context.params : {};
  const tripId = params?.tripId ?? extractTripIdFromUrl(request.url);
  if (!tripId) {
    return NextResponse.json(
      { error: 'Trip ID missing from request.' },
      { status: 400 }
    );
  }

  try {
    const trip = await getTrip(tripId);
    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found.' },
        { status: 404 }
      );
    }

    if (trip.itinerary?.cards?.length) {
      return NextResponse.json({ trip });
    }

    const itinerary = buildDefaultItinerary(trip);
    const updated = await updateTrip(tripId, { itinerary });

    if (!updated) {
      return NextResponse.json(
        { error: 'Unable to update trip.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ trip: updated });
  } catch (err) {
    console.error('Failed to generate itinerary', err);
    return NextResponse.json(
      { error: 'Failed to generate itinerary.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  const params = context?.params ? await context.params : {};
  const tripId = params?.tripId ?? extractTripIdFromUrl(request.url);
  if (!tripId) {
    return NextResponse.json(
      { error: 'Trip ID missing from request.' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Failed to read auth session', error);
      return NextResponse.json(
        { error: 'Unable to validate your session.' },
        { status: 401 }
      );
    }

    const user = data?.user ?? null;
    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to delete trips.' },
        { status: 401 }
      );
    }

    const trip = await getTrip(tripId);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    const isAdmin = isAdminUser(user);
    if (!isAdmin && trip.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this trip.' },
        { status: 403 }
      );
    }

    const deleted = await deleteTrip(tripId);
    if (!deleted) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete trip', err);
    return NextResponse.json(
      { error: 'Failed to delete trip.' },
      { status: 500 }
    );
  }
}

function buildItinerary(trip) {
  return buildDefaultItinerary(trip);
}

function extractTripIdFromUrl(url) {
  try {
    const { pathname } = new URL(url, 'http://localhost');
    const parts = pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? null;
  } catch {
    return null;
  }
}
