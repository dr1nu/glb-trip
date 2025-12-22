import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listTrips } from '@/lib/db';
import { getAdminUser } from '@/lib/auth';
import LogoutButton from './_components/LogoutButton';
import AdminNav from './_components/AdminNav';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatDate(iso) {
  if (!iso) return 'unknown';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function euro(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `€${Math.round(value)}`;
}

export default async function AdminPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/admin/login');
  }

  const trips = await listTrips();

  return (
    <main className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Admin
          </p>
          <h1 className="text-2xl font-semibold">Trips dashboard</h1>
          <p className="text-sm text-neutral-400">
            {trips.length === 0
              ? 'No trips have been captured yet.'
              : `Showing ${trips.length} trip${trips.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminNav />
          <LogoutButton />
        </div>
      </header>

      {trips.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center text-sm text-neutral-300">
          Generate a trip from the homepage to see it appear here.
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => {
            const {
              id,
              createdAt,
              destinationCountry,
              homeCountry,
              tripLengthDays,
              budgetTotal,
              result = {},
              itinerary = null,
            } = trip;

            return (
              <article
                key={id}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {homeCountry} → {destinationCountry}
                    </h2>
                    <p className="text-xs text-neutral-400">
                      Generated {formatDate(createdAt)} · {tripLengthDays} day
                      {tripLengthDays === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/trip/${id}?from=admin`}
                      className="text-sm font-medium text-orange-300 hover:text-orange-200"
                    >
                      View trip →
                    </Link>
                    {itinerary?.cards?.length ? (
                      <Link
                        href={`/trip/${id}/builder?from=admin`}
                        className="text-sm font-medium text-orange-300 hover:text-orange-200"
                      >
                        Open builder →
                      </Link>
                    ) : null}
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <Fact label="Budget" value={euro(budgetTotal)} />
                  <Fact label="Daily budget" value={euro(result.perDay)} />
                  <Fact
                    label="Accommodation"
                    value={
                      result.accom
                        ? `${euro(result.accom)} (${result.bucket ?? '—'})`
                        : '—'
                    }
                  />
                  <Fact label="Other daily costs" value={euro(result.other)} />
                  <Fact
                    label="Flights"
                    value={
                      result.flight
                        ? `${euro(result.flight.low)} – ${euro(result.flight.high)}`
                        : '—'
                    }
                  />
                  <Fact
                    label="Fits budget?"
                    value={
                      typeof result.fits === 'boolean'
                        ? result.fits
                          ? 'Yes'
                          : 'No'
                        : 'Unknown'
                    }
                  />
                  <Fact
                    label="Itinerary"
                    value={
                      itinerary?.cards?.length
                        ? `${itinerary.cards.length} cards`
                        : 'Not created'
                    }
                  />
                </dl>

                {trip.contact ? (
                  <div className="mt-4 bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-sm">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-400">
                      Traveller account
                    </p>
                    <div className="text-neutral-100 font-medium">
                      {trip.contact.name ||
                        [trip.contact.firstName, trip.contact.lastName]
                          .filter(Boolean)
                          .join(' ') ||
                        '—'}
                    </div>
                    <div className="text-neutral-300">{trip.contact.email || '—'}</div>
                    <div className="text-neutral-400 text-xs mt-1">
                      Home:{' '}
                      {trip.contact.homeCountry || trip.contact.city || '—'} • Airport:{' '}
                      {trip.contact.nearestAirport || '—'}
                    </div>
                    <div className="text-neutral-400 text-xs mt-1">
                      Adults: {trip.contact.adults ?? '—'} • Children:{' '}
                      {trip.contact.children ?? '—'}
                    </div>
                    {trip.ownerId ? (
                      <div className="text-xs text-neutral-500 mt-1">
                        User ID: {trip.ownerId}
                      </div>
                    ) : null}
                  </div>
                ) : null}

              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Fact({ label, value }) {
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3">
      <dt className="text-[11px] uppercase tracking-wide text-neutral-400">
        {label}
      </dt>
      <dd className="text-sm font-medium text-neutral-100 mt-1">{value}</dd>
    </div>
  );
}
