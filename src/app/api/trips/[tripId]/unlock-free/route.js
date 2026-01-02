import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTrip, updateTrip } from '@/lib/db';

const RATE_PER_DAY_CENTS = 300;

export async function POST(request, context) {
  const params = context?.params ? await context.params : {};
  const tripId = params.tripId;

  if (!tripId) {
    return NextResponse.json(
      { error: 'Trip ID is required.' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in to unlock.' }, { status: 401 });
    }

    const trip = await getTrip(tripId);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    if (trip.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to unlock this trip.' },
        { status: 403 }
      );
    }

    if (!trip.published) {
      return NextResponse.json(
        { error: 'Itinerary is not ready for unlock yet.' },
        { status: 400 }
      );
    }

    if (trip.billingStatus !== 'pending') {
      return NextResponse.json(
        { error: 'This trip does not require unlock.' },
        { status: 400 }
      );
    }

    const effectiveAmountCents =
      typeof trip.billingCustomAmountCents === 'number'
        ? trip.billingCustomAmountCents
        : typeof trip.billingAmountCents === 'number'
          ? trip.billingAmountCents
          : Math.max(0, Math.round((trip.tripLengthDays ?? 0) * RATE_PER_DAY_CENTS));

    if (!Number.isFinite(effectiveAmountCents) || effectiveAmountCents > 0) {
      return NextResponse.json(
        { error: 'This trip is not eligible for free unlock.' },
        { status: 400 }
      );
    }

    const updated = await updateTrip(tripId, {
      billingStatus: 'free',
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to unlock trip.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('Failed to unlock trip for free', err);
    return NextResponse.json(
      { error: 'Failed to unlock trip.' },
      { status: 500 }
    );
  }
}
