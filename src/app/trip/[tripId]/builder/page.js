import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTrip } from '@/lib/db';
import { listTemplates } from '@/lib/templates';
import { extractUnassignedActivities } from '@/lib/itinerary';
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
  const unassignedActivities = extractUnassignedActivities(itinerary);

  const origin = trip.homeCountry ?? 'Home';
  const destination = trip.destinationCountry ?? 'Destination';
  const lengthLabel = `${trip.tripLengthDays} day${
    trip.tripLengthDays === 1 ? '' : 's'
  }`;
  const templates = await listTemplates();
  const sortedTemplates = Array.isArray(templates)
    ? templates.sort((a, b) => {
        const aMatch = a.destinationCountry === trip.destinationCountry ? 1 : 0;
        const bMatch = b.destinationCountry === trip.destinationCountry ? 1 : 0;
        return bMatch - aMatch;
      })
    : [];

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
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-[1px] hover:border-orange-200 hover:text-[#C2461E]"
          >
            <span className="text-sm" aria-hidden>
              ←
            </span>
            Back to trip
          </Link>
        </header>

        <TripBuilderClient
          tripId={tripId}
          initialCards={itinerary.cards}
          initialActivities={unassignedActivities}
          destinationCountry={trip.destinationCountry}
          homeCountry={trip.homeCountry}
          tripLengthDays={trip.tripLengthDays}
          templates={sortedTemplates}
          preferences={trip.preferences}
          contact={trip.contact}
          budgetTotal={trip.budgetTotal}
        />
      </div>
    </main>
  );
}
