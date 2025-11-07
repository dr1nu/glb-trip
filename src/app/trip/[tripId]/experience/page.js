import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTrip } from '@/lib/db';
import TripExperienceClient from './_components/TripExperienceClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function TripExperiencePage({ params, searchParams }) {
  const { tripId } = await params;
  const query = (await searchParams) ?? {};
  const fromAdmin = query.from === 'admin';
  const trip = await getTrip(tripId);

  if (!trip) {
    notFound();
  }

  const itinerary = trip.itinerary ?? null;
  if (!itinerary?.cards?.length) {
    const fallback = fromAdmin ? `/trip/${tripId}?from=admin` : `/trip/${tripId}`;
    redirect(fallback);
  }

  const dayCards = itinerary.cards.filter((card) => card.type === 'day');

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Link
          href={fromAdmin ? `/trip/${tripId}?from=admin` : `/trip/${tripId}`}
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200"
        >
          <span aria-hidden>←</span>
          Back to trip
        </Link>

        <TripExperienceClient
          tripId={tripId}
          fromAdmin={fromAdmin}
          destinationCountry={trip.destinationCountry}
          homeCountry={trip.homeCountry}
          tripLengthDays={trip.tripLengthDays}
          summaryCards={itinerary.cards}
          dayCards={dayCards}
        />
      </div>
    </main>
  );
}
