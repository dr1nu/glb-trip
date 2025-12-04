import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTrip } from '@/lib/db';
import TripExperienceClient from './_components/TripExperienceClient';

function isDayCard(card, index) {
  if (!card) return false;
  const type = typeof card.type === 'string' ? card.type.toLowerCase() : '';
  const title = typeof card.title === 'string' ? card.title : '';
  const id = typeof card.id === 'string' ? card.id : '';
  if (type === 'departure' || type === 'return' || type === 'flight') return false;
  if (type === 'budget' || type === 'summary' || type === 'cost') return false;
  if (
    type === 'day' ||
    type === 'daily' ||
    type === 'day-card' ||
    type === 'itinerary-day' ||
    /^day\\s*\\d+/i.test(title) ||
    /^day[-_]/i.test(id)
  ) {
    return true;
  }
  if (Array.isArray(card.timeline) && card.timeline.length > 0) return true;
  if (card.fields?.city || card.fields?.dailyCost || card.fields?.highlightAttraction) return true;
  return false;
}

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

  const dayCards = itinerary.cards.filter((card, idx) => isDayCard(card, idx));

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#eaf3ff] via-white to-[#fffaf5] text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Link
          href={fromAdmin ? `/trip/${tripId}?from=admin` : `/trip/${tripId}`}
          className="inline-flex items-center gap-1 text-sm text-[#4C5A6B] hover:text-[#4C5A6B]"
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
