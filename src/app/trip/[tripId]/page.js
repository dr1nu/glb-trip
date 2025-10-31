import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTrip } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function euro(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `€${Math.round(value)}`;
}

export default async function TripPage({ params, searchParams }) {
  const { tripId } = await params;
  const query = (await searchParams) ?? {};
  const fromAdmin = query.from === 'admin';
  const trip = await getTrip(tripId);
  if (!trip) {
    notFound();
  }

  const {
    id,
    createdAt,
    destinationCountry,
    homeCountry,
    tripLengthDays,
    budgetTotal,
    result = {},
    contact = null,
  } = trip;

  const {
    perDay,
    accom,
    other,
    bucket,
    styleLabel,
    flight = {},
    totalLow,
    totalHigh,
    fits,
    suggestion,
  } = result;

  const createdLabel = createdAt
    ? new Date(createdAt).toLocaleString()
    : 'unknown';

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-100 p-4 flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <Link
          href={fromAdmin ? '/admin' : '/'}
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200"
        >
          <span aria-hidden>←</span>
          {fromAdmin ? 'Back to admin' : 'Plan another trip'}
        </Link>

        <section className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">
                Trip to {destinationCountry}
              </h1>
              <p className="text-sm text-neutral-400">
                Generated {createdLabel}
              </p>
            </div>
            <span className="text-xs uppercase tracking-wide text-neutral-400 border border-neutral-700 rounded-lg px-3 py-1">
              ID {id}
            </span>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Fact label="Destination" value={destinationCountry} />
            <Fact label="Home" value={homeCountry} />
            <Fact label="Trip length" value={`${tripLengthDays} day${tripLengthDays === 1 ? '' : 's'}`} />
            <Fact label="Travel style" value={styleLabel ?? 'Not captured'} />
            <Fact label="Budget" value={euro(budgetTotal)} />
            <Fact label="Daily spend" value={perDay ? `${euro(perDay)} / day` : 'Not captured'} />
          </div>

          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="text-neutral-400">Estimated total</span>
              <span className="font-semibold">
                {euro(totalLow)} – {euro(totalHigh)}
              </span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-neutral-400">
              <span>Accommodation ({bucket ?? '—'})</span>
              <span>{accom ? euro(accom) : '—'}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-neutral-400">
              <span>Other daily costs</span>
              <span>{other ? euro(other) : '—'}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-neutral-400">
              <span>Flights</span>
              <span>
                {flight.low ? euro(flight.low) : '—'} – {flight.high ? euro(flight.high) : '—'}
              </span>
            </div>
            <div className={`font-semibold ${fits ? 'text-green-400' : 'text-red-400'}`}>
              {fits ? 'This itinerary fits the budget.' : suggestion || 'Budget data unavailable.'}
            </div>
          </div>
        </section>

        {contact ? (
          <section className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 space-y-4">
            <header>
              <h2 className="text-lg font-semibold">Traveller details</h2>
              <p className="text-sm text-neutral-400">
                Captured when the holiday request was submitted.
              </p>
            </header>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <Detail label="Name" value={contact.name} />
              <Detail label="Email" value={contact.email} />
              <Detail label="City" value={contact.city} />
              <Detail
                label="Party"
                value={`${contact.adults} adult${contact.adults === 1 ? '' : 's'}${typeof contact.children === 'number' && contact.children > 0 ? ` · ${contact.children} child${contact.children === 1 ? '' : 'ren'}` : ''}`}
              />
              {contact.details ? (
                <Detail
                  label="Requests"
                  value={contact.details}
                  className="sm:col-span-2"
                />
              ) : null}
            </dl>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Fact({ label, value }) {
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="text-sm font-medium">{value ?? '—'}</div>
    </div>
  );
}

function Detail({ label, value, className = '' }) {
  return (
    <div
      className={`bg-neutral-900 border border-neutral-700 rounded-lg p-3 space-y-1 ${className}`}
    >
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="text-sm font-medium break-words">
        {value ?? '—'}
      </div>
    </div>
  );
}
