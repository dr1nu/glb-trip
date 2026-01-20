import Link from 'next/link';
import { ArrowLeftCircle } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { getTrip } from '@/lib/db';
import { extractUnassignedActivities } from '@/lib/itinerary';
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
  if (card.fields?.city) return true;
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

  if (!fromAdmin && !trip.published) {
    redirect(`/trip/${tripId}`);
  }
  const effectiveAmountCents =
    typeof trip.billingCustomAmountCents === 'number'
      ? trip.billingCustomAmountCents
      : typeof trip.billingAmountCents === 'number'
        ? trip.billingAmountCents
        : Math.max(0, Math.round((trip.tripLengthDays ?? 0) * 300));
  if (!fromAdmin && trip.billingStatus === 'pending' && effectiveAmountCents > 0) {
    redirect(`/trip/${tripId}`);
  }

  const itinerary = trip.itinerary ?? null;
  if (!itinerary?.cards?.length) {
    const fallback = fromAdmin
      ? `/trip/${tripId}?from=admin`
      : `/trip/${tripId}`;
    redirect(fallback);
  }

  const dayCards = itinerary.cards.filter((card, idx) => isDayCard(card, idx));
  const otherActivities = extractUnassignedActivities(itinerary);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#eaf3ff] via-white to-[#fffaf5] text-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Link
          href={fromAdmin ? `/trip/${tripId}/builder?from=admin` : '/my-trips'}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-[1px] hover:border-orange-200 hover:text-[#C2461E]"
        >
          <ArrowLeftCircle className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
          {fromAdmin ? 'Back to trip builder' : 'Back to my trips'}
        </Link>

        <TripExperienceClient
          tripId={tripId}
          fromAdmin={fromAdmin}
          destinationCountry={trip.destinationCountry}
          homeCountry={trip.homeCountry}
          tripLengthDays={trip.tripLengthDays}
          summaryCards={itinerary.cards}
          dayCards={dayCards}
          otherActivities={otherActivities}
          preferences={trip.preferences}
        />
      </div>
    </main>
  );
}
