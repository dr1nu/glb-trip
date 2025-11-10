import Link from 'next/link';
import { listTripsByOwner } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import SignOutButton from './_components/SignOutButton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatDate(value) {
  if (!value) return 'Pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Pending';
  return date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function MyTripsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-neutral-900 text-neutral-100 p-4 flex justify-center items-center">
        <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-semibold">My trips</h1>
          <p className="text-sm text-neutral-400">
            Sign in to save itineraries and view them across devices.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-orange-500 text-neutral-900 font-semibold text-sm hover:bg-orange-400"
          >
            Start planning →
          </Link>
        </div>
      </main>
    );
  }

  const trips = await listTripsByOwner(user.id);

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-100 p-4 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <h1 className="text-2xl font-semibold">My trips</h1>
            <p className="text-sm text-neutral-400">
              {trips.length === 0
                ? 'Save a trip to see it appear here.'
                : `${trips.length} saved trip${trips.length === 1 ? '' : 's'}.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-orange-400 hover:text-orange-300"
            >
              New search
            </Link>
            <SignOutButton />
          </div>
        </header>

        {trips.length === 0 ? (
          <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 text-sm text-neutral-400 text-center">
            Plan a new holiday to add your first trip.
          </div>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <article
                key={trip.id}
                className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-neutral-400">
                      {formatDate(trip.createdAt)}
                    </p>
                    <h2 className="text-lg font-semibold">
                      {trip.homeCountry} → {trip.destinationCountry}
                    </h2>
                  </div>
                  <Link
                    href={`/trip/${trip.id}`}
                    className="text-sm font-medium text-orange-400 hover:text-orange-300"
                  >
                    View trip →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <Info label="Budget" value={trip.budgetTotal ? `€${Math.round(trip.budgetTotal)}` : '—'} />
                  <Info label="Length" value={trip.tripLengthDays ? `${trip.tripLengthDays} days` : '—'} />
                  <Info
                    label="Status"
                    value={trip.itinerary?.cards?.length ? 'Itinerary ready' : 'Pending'}
                  />
                  <Info label="Published" value={trip.published ? 'Yes' : 'No'} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-3 space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-sm font-medium text-neutral-100">{value}</p>
    </div>
  );
}
