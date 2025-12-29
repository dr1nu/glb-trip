import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTrip } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

const RATE_PER_DAY_CENTS = 300;

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const tripId = payload?.tripId;
  if (!tripId || typeof tripId !== 'string') {
    return NextResponse.json({ error: 'Trip ID is required.' }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Please sign in to pay.' }, { status: 401 });
    }

    const trip = await getTrip(tripId);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    if (trip.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to pay for this trip.' },
        { status: 403 }
      );
    }

    if (!trip.published) {
      return NextResponse.json(
        { error: 'Itinerary is not ready for payment yet.' },
        { status: 400 }
      );
    }

    if (trip.billingStatus !== 'pending') {
      return NextResponse.json(
        { error: 'This trip does not require payment.' },
        { status: 400 }
      );
    }

    const effectiveAmountCents =
      typeof trip.billingCustomAmountCents === 'number'
        ? trip.billingCustomAmountCents
        : typeof trip.billingAmountCents === 'number'
          ? trip.billingAmountCents
          : Math.max(0, Math.round((trip.tripLengthDays ?? 0) * RATE_PER_DAY_CENTS));

    if (!Number.isFinite(effectiveAmountCents) || effectiveAmountCents <= 0) {
      return NextResponse.json(
        { error: 'Unable to calculate payment amount.' },
        { status: 400 }
      );
    }

    const origin = new URL(request.url).origin;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email || undefined,
      client_reference_id: tripId,
      metadata: {
        tripId,
        ownerId: user.id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (trip.billingCurrency || 'EUR').toLowerCase(),
            unit_amount: effectiveAmountCents,
            product_data: {
              name: `Trip itinerary for ${trip.destinationCountry || 'your trip'}`,
              description: `${trip.tripLengthDays || 0}-day itinerary unlock`,
            },
          },
        },
      ],
      success_url: `${origin}/trip/${tripId}?paid=1`,
      cancel_url: `${origin}/trip/${tripId}?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Failed to create checkout session', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session.' },
      { status: 500 }
    );
  }
}
