'use client';

export default function ItinerarySummary({
  cards,
  title = 'Itinerary',
  description = 'Finalised trip cards shared by your travel specialist.',
  className = '',
}) {
  const safeCards = Array.isArray(cards) ? cards : [];

  if (safeCards.length === 0) {
    return (
      <section
        className={`bg-neutral-800 border border-neutral-700 rounded-2xl p-6 space-y-3 ${className}`}
      >
        <header>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-neutral-400">{description}</p>
        </header>
        <p className="text-sm text-neutral-500">
          Itinerary cards will appear here once the trip is ready.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`bg-neutral-800 border border-neutral-700 rounded-2xl p-6 space-y-4 ${className}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-neutral-400">{description}</p>
        </div>
        <span className="text-xs uppercase tracking-wide text-neutral-400 border border-neutral-700 rounded-lg px-3 py-1">
          {safeCards.length} card{safeCards.length === 1 ? '' : 's'}
        </span>
      </header>

      <div className="space-y-4">
        {safeCards.map((card) => (
          <ItinerarySummaryCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}

function ItinerarySummaryCard({ card }) {
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
      linkLabel: 'Book this flight',
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
      linkLabel: 'Book accommodation',
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
  const hasPrice =
    typeof price === 'string' ? price.trim().length > 0 : Boolean(price);
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
        {hasPrice ? price : 'Set soon'}
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
      {valid.map(({ label, value, isLink, linkLabel }) => (
        <div
          key={label}
          className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2 last:border-b-0 last:pb-0"
        >
          <dt className="text-neutral-400">{label}</dt>
          <dd className="font-medium text-neutral-100">
            {isLink ? <BookingLink href={value} label={linkLabel} /> : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function BookingLink({ href, label = 'Book now' }) {
  if (typeof href !== 'string' || !href) return '—';
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-orange-400 transition-colors"
    >
      {label}
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
