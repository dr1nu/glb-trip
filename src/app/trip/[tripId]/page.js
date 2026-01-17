import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTrip } from '@/lib/db';
import TripRequestOverview from './_components/TripRequestOverview';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function TripPage({ params, searchParams }) {
  const { tripId } = await params;
  const query = (await searchParams) ?? {};
  const fromAdmin = query.from === 'admin';
  const trip = await getTrip(tripId);
  if (!trip) {
    notFound();
  }

  const itinerary = trip.itinerary ?? null;
  const published = Boolean(trip.published);
  const itineraryReady = Boolean(itinerary?.cards?.length) && (fromAdmin || published);
  const effectiveAmountCents =
    typeof trip.billingCustomAmountCents === 'number'
      ? trip.billingCustomAmountCents
      : typeof trip.billingAmountCents === 'number'
        ? trip.billingAmountCents
        : Math.max(0, Math.round((trip.tripLengthDays ?? 0) * 300));
  const paymentRequired =
    itineraryReady &&
    !fromAdmin &&
    trip.billingStatus === 'pending' &&
    effectiveAmountCents > 0;
  const isFreeUnlock =
    itineraryReady &&
    !fromAdmin &&
    trip.billingStatus === 'pending' &&
    effectiveAmountCents <= 0;
  const immersiveHref = fromAdmin
    ? `/trip/${trip.id}/experience?from=admin`
    : `/trip/${trip.id}/experience`;

  if (
    itineraryReady &&
    !fromAdmin &&
    !paymentRequired &&
    !isFreeUnlock &&
    trip.billingStatus !== 'free'
  ) {
    redirect(immersiveHref);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fff7ef] via-white to-[#fff8f0] text-slate-900 px-4 py-6 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">
        <Link
          href={fromAdmin ? '/admin' : '/'}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-[1px] hover:border-orange-200 hover:text-[#C2461E]"
        >
          <span className="text-sm" aria-hidden>
            ←
          </span>
          {fromAdmin ? 'Back to admin' : 'Plan another trip'}
        </Link>

        <TripRequestOverview trip={trip} fromAdmin={fromAdmin} />
      </div>
    </main>
  );
}
