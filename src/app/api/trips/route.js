import { NextResponse } from 'next/server';
import { createTrip, getTrip, listTrips } from '@/lib/db';

export const dynamic = 'force-dynamic';

function normalizePayload(data) {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Body must be an object.');
  }

  const {
    destinationCountry,
    homeCountry,
    tripLengthDays,
    budgetTotal,
    result,
  } = data;

  if (!destinationCountry || typeof destinationCountry !== 'string') {
    throw new Error('destinationCountry is required.');
  }
  if (!homeCountry || typeof homeCountry !== 'string') {
    throw new Error('homeCountry is required.');
  }

  const days = Number(tripLengthDays);
  if (!Number.isFinite(days) || days < 1) {
    throw new Error('tripLengthDays must be a positive number.');
  }

  const budget = Number(budgetTotal);
  if (!Number.isFinite(budget) || budget < 0) {
    throw new Error('budgetTotal must be a non-negative number.');
  }

  return {
    destinationCountry,
    homeCountry,
    tripLengthDays: days,
    budgetTotal: budget,
    result: typeof result === 'object' && result !== null ? result : {},
  };
}

export async function POST(request) {
  let payload;
  try {
    payload = normalizePayload(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid body.' },
      { status: 400 }
    );
  }

  try {
    const trip = await createTrip(payload);
    return NextResponse.json({ tripId: trip.id });
  } catch (err) {
    console.error('Failed to create trip', err);
    return NextResponse.json(
      { error: 'Failed to persist trip.' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('tripId') ?? searchParams.get('id');

  try {
    if (id) {
      const trip = await getTrip(id);
      if (!trip) {
        return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
      }
      return NextResponse.json({ trip });
    }

    const trips = await listTrips();
    return NextResponse.json({ trips });
  } catch (err) {
    console.error('Failed to read trip(s)', err);
    return NextResponse.json(
      { error: 'Failed to load trips.' },
      { status: 500 }
    );
  }
}
