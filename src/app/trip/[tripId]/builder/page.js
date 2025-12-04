import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTrip } from '@/lib/db';
import { listTemplates } from '@/lib/templates';
import TripBuilderClient from './_components/TripBuilderClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function TripBuilderPage({ params }) {
  const { tripId } = await params;
  const trip = await getTrip(tripId);
  if (!trip) {
    notFound();
  }

  const itinerary = trip.itinerary ?? null;
  if (!itinerary?.cards?.length) {
    redirect(`/trip/${tripId}?from=admin`);
  }

  const origin = trip.homeCountry ?? 'Home';
  const destination = trip.destinationCountry ?? 'Destination';
  const lengthLabel = `${trip.tripLengthDays} day${
    trip.tripLengthDays === 1 ? '' : 's'
  }`;
  const templates = await listTemplates({
    destinationCountry: trip.destinationCountry,
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#eaf3ff] via-white to-[#fffaf5] text-slate-900 p-6 flex justify-center">
      <div className="w-full max-w-4xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Trip builder</h1>
            <p className="text-sm text-[#4C5A6B] mt-1">
              Refine flights and core logistics before sharing with the client.
            </p>
            <p className="text-xs text-[#4C5A6B] mt-2 uppercase tracking-wide">
              {origin} → {destination} · {lengthLabel}
            </p>
          </div>
          <Link
            href={`/trip/${tripId}?from=admin`}
            className="text-sm font-medium text-orange-400 hover:text-orange-300"
          >
            ← Back to trip
          </Link>
        </header>

        <TripBuilderClient
          tripId={tripId}
          initialCards={itinerary.cards}
          destinationCountry={trip.destinationCountry}
          tripLengthDays={trip.tripLengthDays}
          templates={templates}
        />
      </div>
    </main>
  );
}
