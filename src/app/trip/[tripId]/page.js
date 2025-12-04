import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTrip } from '@/lib/db';
import CreateItineraryButton from './_components/CreateItineraryButton';
import ItinerarySummary from './_components/ItinerarySummary';
import TripImagePicker from './_components/TripImagePicker';

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
    itinerary = null,
    preferences = null,
    imagePath = null,
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

  const itineraryReady = Boolean(itinerary?.cards?.length);
  const immersiveHref = fromAdmin
    ? `/trip/${id}/experience?from=admin`
    : `/trip/${id}/experience`;
  const showTravellerCTA = itineraryReady && !fromAdmin;
  const showAdminCTA = itineraryReady && fromAdmin;

  return (
    <main className="min-h-screen bg-white text-slate-900 p-4 flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <Link
          href={fromAdmin ? '/admin' : '/'}
          className="inline-flex items-center gap-1 text-sm text-[#4C5A6B] hover:text-[#4C5A6B]"
        >
          <span aria-hidden>←</span>
          {fromAdmin ? 'Back to admin' : 'Plan another trip'}
        </Link>

        <section className="bg-orange-50 border border-orange-100 rounded-2xl p-6 space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">
                Trip to {destinationCountry}
              </h1>
              <p className="text-sm text-[#4C5A6B]">
                Generated {createdLabel}
              </p>
            </div>
            <span className="text-xs uppercase tracking-wide text-[#4C5A6B] border border-orange-100 rounded-lg px-3 py-1">
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

          {fromAdmin ? (
            <TripImagePicker
              tripId={id}
              destinationCountry={destinationCountry}
              initialImagePath={imagePath ?? ''}
            />
          ) : null}

          <div className="bg-white border border-orange-100 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="text-[#4C5A6B]">Estimated total</span>
              <span className="font-semibold">
                {euro(totalLow)} – {euro(totalHigh)}
              </span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-[#4C5A6B]">
              <span>Accommodation ({bucket ?? '—'})</span>
              <span>{accom ? euro(accom) : '—'}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-[#4C5A6B]">
              <span>Other daily costs</span>
              <span>{other ? euro(other) : '—'}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-[#4C5A6B]">
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

        {contact || preferences ? (
          <section className="bg-orange-50 border border-orange-100 rounded-2xl p-6 space-y-4">
            <header>
              <h2 className="text-lg font-semibold">Traveller details</h2>
              <p className="text-sm text-[#4C5A6B]">
                Captured when the holiday request was submitted.
              </p>
            </header>
            {contact ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <Detail
                  label="Name"
                  value={
                    contact.name ||
                    [contact.firstName, contact.lastName].filter(Boolean).join(' ')
                  }
                />
                <Detail label="Email" value={contact.email} />
                <Detail
                  label="Home country"
                  value={contact.homeCountry || contact.city || '—'}
                />
                <Detail
                  label="Nearest airport"
                  value={contact.nearestAirport || '—'}
                />
                <Detail
                  label="Party"
                  value={`${contact.adults} adult${contact.adults === 1 ? '' : 's'}${
                    typeof contact.children === 'number' && contact.children > 0
                      ? ` · ${contact.children} child${
                          contact.children === 1 ? '' : 'ren'
                        }`
                      : ''
                  }`}
                />
                {contact.details ? (
                  <Detail
                    label="Requests"
                    value={contact.details}
                    className="sm:col-span-2"
                  />
                ) : null}
              </dl>
            ) : (
              <p className="text-sm text-[#4C5A6B]">Traveller details were not captured.</p>
            )}

            {preferences ? (
              <div className="pt-4 border-t border-orange-100 space-y-3">
                <p className="text-[11px] uppercase tracking-wide text-[#4C5A6B]">
                  Trip preferences
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <Detail label="Baggage" value={formatBaggage(preferences)} />
                  <Detail label="Travel window" value={formatTravelWindow(preferences)} />
                  <Detail label="Accommodation" value={formatAccommodation(preferences)} />
                  <Detail
                    label="Interests"
                    value={
                      Array.isArray(preferences.interests) && preferences.interests.length > 0
                        ? preferences.interests.join(', ')
                        : '—'
                    }
                  />
                  <Detail
                    label="Special requests"
                    value={preferences.details || '—'}
                    className="sm:col-span-2"
                  />
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {itineraryReady ? (
          <ItinerarySummary
            cards={itinerary?.cards || []}
            title="Day-by-day overview"
            description="Quick view of your departure, stay, and daily highlights."
          />
        ) : null}

        {showTravellerCTA ? (
          <section className="bg-white border border-orange-100 rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Your itinerary is live</h2>
              <p className="text-sm text-[#4C5A6B]">
                Jump into the immersive view to explore day-by-day plans and booking links.
              </p>
            </div>
            <Link
              href={immersiveHref}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-orange-500 text-sm font-semibold text-neutral-900 hover:bg-orange-400 transition-colors"
            >
              View my itinerary
            </Link>
          </section>
        ) : null}

        {fromAdmin ? (
          <CreateItineraryButton
            tripId={id}
            hasItinerary={Boolean(itinerary?.cards?.length)}
            cardCount={itinerary?.cards?.length ?? 0}
          />
        ) : null}

        {showAdminCTA ? (
          <div className="text-right">
            <Link
              href={immersiveHref}
              className="text-sm font-medium text-orange-400 hover:text-orange-300"
            >
              Open immersive view →
            </Link>
          </div>
        ) : null}

        {!itineraryReady ? <ItineraryStatus fromAdmin={fromAdmin} /> : null}
      </div>
    </main>
  );
}

function Fact({ label, value }) {
  return (
    <div className="bg-white border border-orange-100 rounded-lg p-3 space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-[#4C5A6B]">
        {label}
      </div>
      <div className="text-sm font-medium">{value ?? '—'}</div>
    </div>
  );
}

function Detail({ label, value, className = '' }) {
  return (
    <div
      className={`bg-white border border-orange-100 rounded-lg p-3 space-y-1 ${className}`}
    >
      <div className="text-[11px] uppercase tracking-wide text-[#4C5A6B]">
        {label}
      </div>
      <div className="text-sm font-medium break-words">
        {value ?? '—'}
      </div>
    </div>
  );
}

function ItineraryStatus({ fromAdmin }) {
  return (
    <section className="bg-orange-50 border border-orange-100 rounded-2xl p-6 space-y-3">
      <h2 className="text-lg font-semibold">Itinerary status</h2>
      <p className="text-sm text-[#4C5A6B]">
        {fromAdmin
          ? 'Create the trip to generate departure, stay, daily, and budget cards.'
          : 'We are preparing your personalised itinerary. Stay tuned!'}
      </p>
    </section>
  );
}

function formatBaggage(preferences) {
  const map = {
    small: 'Small bag only',
    cabin: 'Cabin bag',
    checked: 'Checked bag',
  };
  return map[preferences?.baggage] ?? '—';
}

function formatTravelWindow(preferences) {
  if (!preferences) return '—';
  if (preferences.travelWindow === 'flexible') {
    return preferences.flexibleMonth ? `Flexible around ${preferences.flexibleMonth}` : 'Flexible';
  }
  if (preferences.travelWindow === 'range' || preferences.travelWindow === 'specific') {
    const from = preferences.dateFrom || 'TBC';
    const to = preferences.dateTo || 'TBC';
    return `${from} → ${to}`;
  }
  return '—';
}

function formatAccommodation(preferences) {
  const map = {
    budget: 'Budget hotel',
    'b&b': 'Bed & breakfast',
    luxury: 'Luxury hotel',
    flat: 'Flat',
    airbnb: 'Airbnb',
    none: 'No preference',
    hotel: 'Hotel',
  };
  return map[preferences?.accommodation] ?? '—';
}
