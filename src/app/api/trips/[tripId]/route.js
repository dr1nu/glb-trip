import { NextResponse } from 'next/server';
import { getTrip, updateTrip } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request, context) {
  const params = context?.params ?? {};
  const tripId = params.tripId ?? extractTripIdFromUrl(request.url);
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

    const itinerary = buildItinerary(trip);
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

function buildItinerary(trip) {
  const {
    tripLengthDays = 3,
    homeCountry,
    destinationCountry,
    result = {},
    budgetTotal,
  } = trip;
  const flight = result.flight ?? {};
  const days = Math.max(1, Number(tripLengthDays) || 1);

  const departureAirports = {
    from: (flight.from ?? homeCountry ?? 'Home').toUpperCase(),
    to: (flight.to ?? destinationCountry ?? 'Destination').toUpperCase(),
  };
  const returnAirports = {
    from: (flight.to ?? destinationCountry ?? 'Destination').toUpperCase(),
    to: (flight.from ?? homeCountry ?? 'Home').toUpperCase(),
  };
  const departurePrice = formatPriceRange(flight.low, flight.high);
  const returnPrice = formatPriceRange(flight.low, flight.high);

  const accomSummary = [
    result.bucket ? `${result.bucket} stay` : null,
    days ? `${days} night${days === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const defaultDailyCost = result.perDay ? euro(result.perDay) : '';

  const dayCards = Array.from({ length: days }, (_, index) => ({
    id: `day-${index + 1}`,
    type: 'day',
    title: `Day ${index + 1}`,
    subtitle: destinationCountry ?? 'Destination',
    priceLabel: defaultDailyCost,
    summary:
      index === 0
        ? 'Arrival, city orientation, highlight activity.'
        : 'Plan headline experiences, dining, and downtime.',
    fields: {
      city: destinationCountry ?? '',
      highlightAttraction: '',
      dailyCost: defaultDailyCost,
    },
    notes: '',
  }));

  const cards = [
    {
      id: 'departure-flight',
      type: 'departure',
      title: 'Departure flight',
      airports: departureAirports,
      priceLabel: departurePrice ?? 'Set price',
      summary: `${departureAirports.from} → ${departureAirports.to}`,
      fields: {
        homeAirport: departureAirports.from,
        arrivalAirport: departureAirports.to,
        baggageType: '',
        departTime: '',
        arrivalTime: '',
        bookingLink: '',
        price: departurePrice ?? '',
      },
      notes: '',
    },
    {
      id: 'accommodation',
      type: 'accommodation',
      title: 'Accommodation',
      subtitle: result.bucket ?? 'Awaiting selection',
      priceLabel: result.accom ? `${euro(result.accom)} / night` : '',
      summary: accomSummary || 'Choose ideal hotel or apartment.',
      fields: {
        lengthOfStay: days ? `${days} night${days === 1 ? '' : 's'}` : '',
        accommodationType: '',
        breakfastIncluded: '',
        bookingLink: '',
        price: result.accom ? `${euro(result.accom)} / night` : '',
      },
      notes: '',
    },
    ...dayCards,
    {
      id: 'return-flight',
      type: 'return',
      title: 'Return flight',
      airports: returnAirports,
      priceLabel: returnPrice ?? 'Set price',
      summary: `${returnAirports.from} → ${returnAirports.to}`,
      fields: {
        homeAirport: returnAirports.from,
        arrivalAirport: returnAirports.to,
        baggageType: '',
        departTime: '',
        arrivalTime: '',
        bookingLink: '',
        price: returnPrice ?? '',
      },
      notes: '',
    },
    {
      id: 'budget-summary',
      type: 'budget',
      title: 'Budget summary',
      summary: buildBudgetSummary(result, budgetTotal),
      notes: '',
    },
  ];

  return {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cards,
  };
}

function buildBudgetSummary(result, totalBudget) {
  const items = [];
  if (result.totalLow && result.totalHigh) {
    items.push(`Trip est. ${euro(result.totalLow)} – ${euro(result.totalHigh)}`);
  }
  if (result.perDay) {
    items.push(`Daily spend ${euro(result.perDay)}`);
  }
  if (typeof totalBudget === 'number') {
    items.push(`Client budget ${euro(totalBudget)}`);
  }
  return items.length > 0
    ? items.join(' · ')
    : 'Outline costs vs. client budget.';
}

function euro(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `€${Math.round(value)}`;
}

function formatPriceRange(low, high) {
  const lowValid = typeof low === 'number' && !Number.isNaN(low);
  const highValid = typeof high === 'number' && !Number.isNaN(high);
  if (lowValid && highValid) {
    return `${euro(low)} – ${euro(high)}`;
  }
  if (lowValid) return euro(low);
  if (highValid) return euro(high);
  return null;
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
