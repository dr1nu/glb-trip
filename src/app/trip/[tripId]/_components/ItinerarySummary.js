'use client';

export default function ItinerarySummary({
  cards,
  title = 'Itinerary',
  description = 'Finalised trip details shared by your travel specialist.',
  className = '',
  preferences = null,
  showFlightDisclaimer = false,
  showAccommodationDisclaimer = false,
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
      </header>

      <div className="space-y-4">
        {safeCards.map((card) => (
          <ItinerarySummaryCard
            key={card.id}
            card={card}
            preferences={preferences}
          />
        ))}
      </div>
      {showFlightDisclaimer ? <FlightDisclaimer /> : null}
      {showAccommodationDisclaimer ? <AccommodationDisclaimer /> : null}
    </section>
  );
}

function ItinerarySummaryCard({ card, preferences }) {
  if (card.type === 'departure' || card.type === 'return') {
    return <FlightDisplay card={card} />;
  }
  if (card.type === 'accommodation') {
    return <AccommodationDisplay card={card} preferences={preferences} />;
  }
  if (card.type === 'day') {
    return <DayDisplay card={card} />;
  }
  return null;
}

function FlightDisplay({ card }) {
  const fields = card.fields ?? {};
  const routeFrom = fields.homeAirport || 'Origin tbc';
  const routeTo = fields.arrivalAirport || 'Destination tbc';
  const priceLabel = card.priceLabel || 'Price tbc';
  const schedule = extractFlightSchedule(fields);
  const flightDate = formatFlightDate(schedule.date) || 'TBC';
  const departTime = schedule.departTime || 'TBC';
  const arrivalTime = schedule.arrivalTime || 'TBC';
  const baggage = fields.baggageType;
  const bookingLink = fields.bookingLink;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border ${CARD_META.flight.border} bg-gradient-to-br from-sky-50 via-white to-white shadow-sm`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${CARD_META.flight.rail}`} />
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`h-11 w-11 rounded-full border flex items-center justify-center ${CARD_META.flight.iconBg}`}
            >
              {getIcon(card.type === 'return' ? 'planeReturn' : 'plane')}
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#4C5A6B]">
                {card.type === 'return' ? 'Return flight' : 'Departure flight'}
              </p>
              <p className="text-lg font-semibold text-slate-900">{flightDate}</p>
            </div>
          </div>
          {bookingLink ? (
            <FlightBookingButton href={bookingLink} label="Book this flight" />
          ) : (
            <span className={`text-xs font-semibold rounded-full px-3 py-1 ${CARD_META.flight.badge}`}>
              Booking soon
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FlightInfoPill label="Departure airport" value={routeFrom} />
          <FlightInfoPill label="Arrival airport" value={routeTo} />
          <FlightInfoPill label="Departure time" value={departTime} />
          <FlightInfoPill label="Arrival time" value={arrivalTime} />
          <FlightInfoPill label="Baggage" value={baggage || 'TBC'} />
          <FlightInfoPill label="Price" value={priceLabel} />
        </div>
      </div>
    </article>
  );
}

function extractFlightSchedule(fields = {}) {
  const departParts = parseDateTimeParts(fields.departTime);
  const arrivalParts = parseDateTimeParts(fields.arrivalTime);
  const date = fields.flightDate || departParts.date || arrivalParts.date || '';
  const departTime = departParts.time || fields.departTime || '';
  const arrivalTime = arrivalParts.time || fields.arrivalTime || '';
  return { date, departTime, arrivalTime };
}

function parseDateTimeParts(value) {
  if (typeof value !== 'string') return { date: '', time: '' };
  const trimmed = value.trim();
  if (!trimmed) return { date: '', time: '' };
  const dateTimeMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[T\s·]+(\d{2}:\d{2})/
  );
  if (dateTimeMatch) {
    return { date: dateTimeMatch[1], time: dateTimeMatch[2] };
  }
  const dateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateMatch) return { date: dateMatch[1], time: '' };
  const timeMatch = trimmed.match(/^(\d{2}:\d{2})$/);
  if (timeMatch) return { date: '', time: timeMatch[1] };
  return { date: '', time: '' };
}

function formatFlightDate(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function formatAccommodationDateParts(fields, preferences) {
  const from = fields?.accommodationDateFrom || preferences?.dateFrom;
  const to = fields?.accommodationDateTo || preferences?.dateTo;
  const fromLabel = formatShortDate(from);
  const toLabel = formatShortDate(to);
  return {
    fromLabel: fromLabel || 'TBC',
    toLabel: toLabel || 'TBC',
  };
}

function formatShortDate(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function AccommodationDisplay({ card, preferences }) {
  const fields = card.fields ?? {};
  const stayType = capitalise(fields.accommodationType ?? '') || card.subtitle || 'Stay details tbc';
  const { fromLabel, toLabel } = formatAccommodationDateParts(fields, preferences);
  const breakfast = formatBreakfast(fields.breakfastIncluded);
  const priceLabel = fields.price || card.priceLabel || 'Price tbc';
  const bookingLink = fields.bookingLink;
  const mapUrl = fields.accommodationMapUrl;
  const embedUrl = buildMapsEmbedUrl(mapUrl);

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border ${CARD_META.accommodation.border} bg-gradient-to-br from-emerald-50 via-white to-white shadow-sm`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${CARD_META.accommodation.rail}`} />
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`h-11 w-11 rounded-full border flex items-center justify-center ${CARD_META.accommodation.iconBg}`}
            >
              {getIcon('home')}
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#4C5A6B]">Accommodation</p>
              <p className="text-lg font-semibold text-slate-900">{stayType}</p>
            </div>
          </div>
          {bookingLink ? (
            <AccommodationBookingButton href={bookingLink} label="Book this stay" />
          ) : (
            <span className={`text-xs font-semibold rounded-full px-3 py-1 ${CARD_META.accommodation.badge}`}>
              Booking soon
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AccommodationInfoPill label="From" value={fromLabel} />
          <AccommodationInfoPill label="To" value={toLabel} />
          <AccommodationInfoPill label="Breakfast" value={breakfast} />
          <AccommodationInfoPill label="Price" value={priceLabel} />
        </div>
        {mapUrl ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-[#4C5A6B]">
              Location
            </p>
            {embedUrl ? (
              <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white/80">
                <iframe
                  title={`${stayType} map`}
                  src={embedUrl}
                  className="h-44 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <MapLink href={mapUrl} label="Open in Google Maps" />
            )}
          </div>
        ) : null}
      </div>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <span className={`self-start text-xs font-semibold rounded-full px-3 py-1 ${accent.badge}`}>
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

function InfoPill({ label, value }) {
  if (!value || `${value}`.trim() === '') return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-sm">
      <p className="text-xs uppercase tracking-wide text-[#4C5A6B]">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}

function FlightInfoPill({ label, value }) {
  if (!value || `${value}`.trim() === '') return null;
  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-sm">
      <p className="text-xs uppercase tracking-wide text-sky-700/80">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function AccommodationInfoPill({ label, value }) {
  if (!value || `${value}`.trim() === '') return null;
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm">
      <p className="text-xs uppercase tracking-wide text-emerald-700/80">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
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

function FlightBookingButton({ href, label = 'Book now' }) {
  if (typeof href !== 'string' || !href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
    >
      {label}
    </a>
  );
}

function AccommodationBookingButton({ href, label = 'Book now' }) {
  if (typeof href !== 'string' || !href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
    >
      {label}
    </a>
  );
}

function FlightDisclaimer() {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs text-amber-900">
      <span className="mt-0.5 text-amber-700" aria-hidden>
        ⚠︎
      </span>
      <p className="leading-relaxed">
        Prices are accurate at the time of itinerary creation. Flight prices may
        fluctuate and should be confirmed at booking.
      </p>
    </div>
  );
}

function AccommodationDisclaimer() {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs text-amber-900">
      <span className="mt-0.5 text-amber-700" aria-hidden>
        ⚠︎
      </span>
      <p className="leading-relaxed">
        Prices and availability are accurate at the time of itinerary creation.
      </p>
    </div>
  );
}

function MapLink({ href, label }) {
  if (typeof href !== 'string' || !href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
    >
      {label}
    </a>
  );
}

function buildMapsEmbedUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.includes('<iframe')) {
    const srcMatch = trimmed.match(/src="([^"]+)"/i);
    if (srcMatch) return srcMatch[1];
  }
  if (trimmed.includes('/maps/embed')) return trimmed;

  try {
    const url = new URL(trimmed);
    const query =
      url.searchParams.get('q') ||
      url.searchParams.get('query') ||
      url.searchParams.get('ll');
    if (query) {
      return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    }
  } catch (err) {
    return '';
  }

  const latLngMatch = trimmed.match(/@(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (latLngMatch) {
    const [, lat, lng] = latLngMatch;
    return `https://www.google.com/maps?q=${lat},${lng}&output=embed`;
  }

  const placeMatch = trimmed.match(/\/place\/([^/]+)/);
  if (placeMatch) {
    const place = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    return `https://www.google.com/maps?q=${encodeURIComponent(place)}&output=embed`;
  }

  return '';
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
      <path d="M21 15.5v-1.6a1 1 0 00-.553-.894L13 10V5.5a1.5 1.5 0 00-3 0V10l-7.447 3.506A1 1 0 002 14.5v1.6l9-1.3v3.364l-2.553.894A1 1 0 008 20.5h2l1.333-.5L12.667 20.5H15a1 1 0 00.553-1.642L13 17.964V14l8 1.5z" />
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
