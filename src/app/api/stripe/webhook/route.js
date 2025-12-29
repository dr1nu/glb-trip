import { NextResponse } from 'next/server';
import { updateTrip } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

export async function POST(request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
  }

  let event;
  try {
    const body = await request.text();
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed.', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const tripId = session?.metadata?.tripId;
      if (tripId) {
        await updateTrip(tripId, {
          billingStatus: 'paid',
          billingPaidAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Failed to handle Stripe webhook', err);
    return NextResponse.json({ error: 'Webhook handler failed.' }, { status: 500 });
  }
}
