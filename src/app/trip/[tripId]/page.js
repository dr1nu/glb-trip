import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTrip } from '@/lib/db';
import CreateItineraryButton from './_components/CreateItineraryButton';

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

        {fromAdmin ? (
          <CreateItineraryButton
            tripId={id}
            hasItinerary={Boolean(itinerary?.cards?.length)}
            cardCount={itinerary?.cards?.length ?? 0}
          />
        ) : null}

        {itinerary?.cards?.length ? (
          <ItineraryDisplay cards={itinerary.cards} />
        ) : (
          <ItineraryStatus fromAdmin={fromAdmin} />
        )}
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

function ItineraryStatus({ fromAdmin }) {
  return (
    <section className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 space-y-3">
      <h2 className="text-lg font-semibold">Itinerary status</h2>
      <p className="text-sm text-neutral-400">
        {fromAdmin
          ? 'Create the trip to generate departure, stay, daily, and budget cards.'
          : 'We are preparing your personalised itinerary. Stay tuned!'}
      </p>
    </section>
  );
}

function ItineraryDisplay({ cards }) {
  return (
    <section className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Itinerary</h2>
          <p className="text-sm text-neutral-400">
            Finalised trip cards shared by your travel specialist.
          </p>
        </div>
        <span className="text-xs uppercase tracking-wide text-neutral-400 border border-neutral-700 rounded-lg px-3 py-1">
          {cards.length} card{cards.length === 1 ? '' : 's'}
        </span>
      </header>

      <div className="space-y-4">
        {cards.map((card) => (
          <ItineraryDisplayCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}

function ItineraryDisplayCard({ card }) {
  if (card.type === 'departure' || card.type === 'return') {
    return <FlightDisplay card={card} />;
  }
  if (card.type === 'accommodation') {
    return <AccommodationDisplay card={card} />;
  }
  if (card.type === 'day') {
    return <DayDisplay card={card} />;
  }
  return null;
}

function FlightDisplay({ card }) {
  const fields = card.fields ?? {};
  const airports = card.airports ?? {};
  const details = [
    { label: 'Home airport', value: fields.homeAirport },
    { label: 'Arrival airport', value: fields.arrivalAirport },
    { label: 'Baggage', value: fields.baggageType },
    { label: 'Departure', value: fields.departTime },
    { label: 'Arrival', value: fields.arrivalTime },
    {
      label: 'Booking link',
      value: fields.bookingLink,
      isLink: true,
    },
  ];

  return (
    <article className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 space-y-4">
      <HeaderWithIcon
        iconType={card.type === 'return' ? 'planeReturn' : 'plane'}
        title={card.type === 'return' ? 'Return flight' : 'Departure flight'}
        subtitle={card.summary || 'Route forthcoming'}
        price={card.priceLabel || 'Price tbc'}
      />
      <DetailList details={details} />
    </article>
  );
}

function AccommodationDisplay({ card }) {
  const fields = card.fields ?? {};
  const details = [
    { label: 'Length of stay', value: fields.lengthOfStay },
    {
      label: 'Accommodation type',
      value: capitalise(fields.accommodationType ?? '') || card.subtitle,
    },
    {
      label: 'Breakfast',
      value: formatBreakfast(fields.breakfastIncluded),
    },
    { label: 'Price', value: fields.price || card.priceLabel },
    {
      label: 'Booking link',
      value: fields.bookingLink,
      isLink: true,
    },
  ];

  return (
    <article className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 space-y-4">
      <HeaderWithIcon
        iconType="home"
        title="Accommodation"
        subtitle={card.subtitle ?? 'Awaiting selection'}
        price={card.priceLabel || 'Price tbc'}
      />
      <DetailList details={details} />
    </article>
  );
}

function DayDisplay({ card }) {
  const fields = card.fields ?? {};
  const details = [
    { label: 'City', value: fields.city || card.subtitle },
    {
      label: 'Highlight',
      value: fields.highlightAttraction || card.summary,
    },
    { label: 'Daily cost', value: fields.dailyCost || card.priceLabel },
  ];

  return (
    <article className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 space-y-4">
      <HeaderWithIcon
        iconType="pin"
        title={card.title}
        subtitle={fields.city || card.subtitle || 'Destination'}
        price={fields.dailyCost || card.priceLabel || 'Cost tbc'}
      />
      <DetailList details={details} />
    </article>
  );
}

function HeaderWithIcon({ iconType, title, subtitle, price }) {
  const icon = getIcon(iconType);
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {icon}
        <div>
          <p className="text-sm font-semibold text-neutral-100">{title}</p>
          <p className="text-xs uppercase tracking-wide text-neutral-400">
            {subtitle ?? 'Details forthcoming'}
          </p>
        </div>
      </div>
      <div className="text-sm font-semibold text-neutral-100">
        {price && price.trim() ? price : 'Set soon'}
      </div>
    </div>
  );
}

function DetailList({ details }) {
  const valid = details.filter((item) => item.value && `${item.value}`.trim());
  if (valid.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Details will be confirmed soon.
      </p>
    );
  }

  return (
    <dl className="space-y-2 text-sm">
      {valid.map(({ label, value, isLink }) => (
        <div
          key={label}
          className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2 last:border-b-0 last:pb-0"
        >
          <dt className="text-neutral-400">{label}</dt>
          <dd className="font-medium text-neutral-100">
            {isLink ? <BookingLink href={value} /> : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function BookingLink({ href }) {
  if (typeof href !== 'string' || !href) return '—';
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-orange-300 hover:text-orange-200 underline"
    >
      View booking
    </a>
  );
}

function getIcon(type) {
  const baseClass =
    'h-12 w-12 rounded-full border flex items-center justify-center';
  if (type === 'planeReturn') {
    return (
      <div
        className={`${baseClass} bg-purple-500/10 border-purple-400/40 text-purple-200`}
      >
        <PlaneIcon />
      </div>
    );
  }
  if (type === 'plane') {
    return (
      <div
        className={`${baseClass} bg-sky-500/10 border-sky-400/40 text-sky-200`}
      >
        <PlaneIcon />
      </div>
    );
  }
  if (type === 'home') {
    return (
      <div
        className={`${baseClass} bg-emerald-500/10 border-emerald-400/40 text-emerald-200`}
      >
        <HomeIcon />
      </div>
    );
  }
  return (
    <div
      className={`${baseClass} bg-rose-500/10 border-rose-400/40 text-rose-200`}
    >
      <PinIcon />
    </div>
  );
}

function PlaneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M21 16.5v-1.764a1 1 0 00-.553-.894L13 10V5.5a1.5 1.5 0 00-3 0V10l-7.447 3.842A1 1 0 002 14.736V16.5l9-1.5v3.764l-2.553.894A1 1 0 008 21.5h2l1.333-.5L12.667 21.5H15a1 1 0 00.553-1.842L13 18.764V15l8 1.5z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M12 3l9 6v12a1 1 0 01-1 1h-6v-6h-4v6H4a1 1 0 01-1-1V9l9-6z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M12 2C8.134 2 5 5.067 5 8.857 5 14.571 12 22 12 22s7-7.429 7-13.143C19 5.067 15.866 2 12 2zm0 9.714a2.857 2.857 0 110-5.714 2.857 2.857 0 010 5.714z" />
    </svg>
  );
}

function formatBreakfast(value) {
  if (!value) return '—';
  const normal = value.toString().trim().toLowerCase();
  if (normal === 'yes') return 'Yes';
  if (normal === 'no') return 'No';
  return capitalise(value);
}

function capitalise(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
