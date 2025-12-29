'use client';

export default function ItinerarySummary({
  cards,
  title = 'Itinerary',
  description = 'Finalised trip details shared by your travel specialist.',
  className = '',
}) {
  const safeCards = Array.isArray(cards) ? cards : [];

  if (safeCards.length === 0) {
    return (
      <section
        className={`bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm shadow-slate-100 space-y-3 ${className}`}
      >
        <header>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-[#4C5A6B]">{description}</p>
        </header>
        <p className="text-sm text-[#4C5A6B]">
          Itinerary details will appear here once the trip is ready.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm shadow-slate-100 space-y-4 ${className}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-[#4C5A6B]">{description}</p>
        </div>
        <span className="text-xs uppercase tracking-wide text-[#4C5A6B] border border-slate-200 rounded-lg px-3 py-1 bg-white/70">
          {safeCards.length} item{safeCards.length === 1 ? '' : 's'}
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
    <SummaryCard
      accent={CARD_META.flight}
      iconType={card.type === 'return' ? 'planeReturn' : 'plane'}
      title={card.type === 'return' ? 'Return flight' : 'Departure flight'}
      subtitle={card.summary || 'Route forthcoming'}
      price={card.priceLabel || 'Price tbc'}
    >
      <DetailList details={details} />
    </SummaryCard>
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
    <SummaryCard
      accent={CARD_META.accommodation}
      iconType="home"
      title="Accommodation"
      subtitle={card.subtitle ?? 'Awaiting selection'}
      price={card.priceLabel || 'Price tbc'}
    >
      <DetailList details={details} />
    </SummaryCard>
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
    <SummaryCard
      accent={CARD_META.day}
      iconType="pin"
      title={card.title}
      subtitle={fields.city || card.subtitle || 'Destination'}
      price={fields.dailyCost || card.priceLabel || 'Cost tbc'}
    >
      <DetailList details={details} />
    </SummaryCard>
  );
}

const CARD_META = {
  flight: {
    rail: 'bg-sky-300',
    border: 'border-sky-100',
    iconBg: 'bg-sky-50 border-sky-200 text-sky-700',
    badge: 'bg-sky-100 text-sky-700 border border-sky-200',
  },
  accommodation: {
    rail: 'bg-emerald-300',
    border: 'border-emerald-100',
    iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  },
  day: {
    rail: 'bg-purple-300',
    border: 'border-purple-100',
    iconBg: 'bg-purple-50 border-purple-200 text-purple-700',
    badge: 'bg-purple-100 text-purple-700 border border-purple-200',
  },
};

function SummaryCard({ accent, iconType, title, subtitle, price, children }) {
  const hasPrice =
    typeof price === 'string' ? price.trim().length > 0 : Boolean(price);
  return (
    <article className={`relative overflow-hidden rounded-2xl border ${accent.border} bg-white shadow-sm`}>
      <div className={`absolute left-0 top-0 h-full w-1 ${accent.rail}`} />
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className={`h-12 w-12 rounded-full border flex items-center justify-center ${accent.iconBg}`}>
              {getIcon(iconType)}
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-900">{title}</p>
              <p className="text-xs uppercase tracking-wide text-[#4C5A6B]">
                {subtitle ?? 'Details forthcoming'}
              </p>
            </div>
          </div>
          <span className={`text-xs font-semibold rounded-full px-3 py-1 ${accent.badge}`}>
            {hasPrice ? price : 'Set soon'}
          </span>
        </div>
        {children}
      </div>
    </article>
  );
}

function DetailList({ details }) {
  const valid = details.filter((item) => item.value && `${item.value}`.trim());
  if (valid.length === 0) {
    return (
      <p className="text-sm text-[#4C5A6B]">
        Details will be confirmed soon.
      </p>
    );
  }

  return (
    <dl className="space-y-2 text-sm">
      {valid.map(({ label, value, isLink, linkLabel }) => (
        <div
          key={label}
          className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0"
        >
          <dt className="text-[#4C5A6B]">{label}</dt>
          <dd className="font-medium text-slate-900">
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
      className="inline-flex items-center justify-center rounded-lg border border-orange-500 px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
    >
      {label}
    </a>
  );
}

function getIcon(type) {
  const icon =
    type === 'home' ? <HomeIcon /> : type === 'planeReturn' || type === 'plane' ? <PlaneIcon /> : <PinIcon />;

  return icon;
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
