import crypto from 'crypto';

const FIELD_WHITELIST = [
  'homeAirport',
  'arrivalAirport',
  'baggageType',
  'departTime',
  'arrivalTime',
  'bookingLink',
  'price',
  'lengthOfStay',
  'accommodationType',
  'breakfastIncluded',
  'city',
  'highlightAttraction',
  'dailyCost',
];

export function getAllowedFieldKeys() {
  return FIELD_WHITELIST.slice();
}

export function normalizeFieldUpdates(updates) {
  if (typeof updates !== 'object' || updates === null) return {};
  const normalized = {};
  for (const key of Object.keys(updates)) {
    if (!FIELD_WHITELIST.includes(key)) continue;
    const value = updates[key];
    if (typeof value === 'string') {
      normalized[key] = value.trim();
    } else if (value === null || typeof value === 'undefined') {
      normalized[key] = '';
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}

export function applyCardFieldUpdates(card, rawUpdates) {
  const updates = normalizeFieldUpdates(rawUpdates);
  if (Object.keys(updates).length === 0) {
    return {
      ...card,
      fields: {
        ...(card.fields ?? {}),
      },
    };
  }

  const fields = {
    ...(card.fields ?? {}),
  };

  for (const [key, value] of Object.entries(updates)) {
    fields[key] = value;
  }

  let priceLabel = card.priceLabel ?? '';
  let subtitle = card.subtitle ?? '';
  let summary = card.summary ?? '';
  let airports =
    card.airports != null
      ? { ...card.airports }
      : card.type === 'departure' || card.type === 'return'
      ? { from: '', to: '' }
      : undefined;

  if (card.type === 'departure' || card.type === 'return') {
    const from = uppercaseCode(fields.homeAirport || airports?.from);
    const to = uppercaseCode(fields.arrivalAirport || airports?.to);
    airports = {
      from,
      to,
    };
    priceLabel = stringify(fields.price);
    if (from && to) {
      summary = `${from} → ${to}`;
    }
  } else if (card.type === 'accommodation') {
    priceLabel = stringify(fields.price);
    subtitle = fields.accommodationType
      ? capitalise(fields.accommodationType)
      : subtitle || 'Awaiting selection';
    const stay = stringify(fields.lengthOfStay);
    const breakfast = stringify(fields.breakfastIncluded);
    const summaryParts = [];
    if (stay) summaryParts.push(stay);
    if (breakfast) {
      summaryParts.push(
        breakfast.toLowerCase() === 'yes'
          ? 'Breakfast included'
          : 'Breakfast not included'
      );
    }
    if (summaryParts.length > 0) {
      summary = summaryParts.join(' · ');
    }
  } else if (card.type === 'day') {
    priceLabel = stringify(fields.dailyCost);
    subtitle = stringify(fields.city) || subtitle;
    if (fields.highlightAttraction) {
      summary = fields.highlightAttraction;
    }
  }

  return {
    ...card,
    fields,
    priceLabel,
    subtitle,
    summary,
    airports,
  };
}

export function capitalise(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function uppercaseCode(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed ? trimmed.toUpperCase() : '';
}

function stringify(value) {
  if (typeof value !== 'string') return value ?? '';
  return value.trim();
}

export function buildDefaultItinerary(trip = {}) {
  const {
    tripLengthDays = 3,
    homeCountry,
    destinationCountry,
    result = {},
    budgetTotal,
  } = trip;
  const flight = result.flight ?? {};
  const days = Math.max(1, Number(tripLengthDays) || 1);

  const departureAirports = {
    from: (flight.from ?? homeCountry ?? 'Home').toUpperCase(),
    to: (flight.to ?? destinationCountry ?? 'Destination').toUpperCase(),
  };
  const returnAirports = {
    from: (flight.to ?? destinationCountry ?? 'Destination').toUpperCase(),
    to: (flight.from ?? homeCountry ?? 'Home').toUpperCase(),
  };
  const departurePrice = formatPriceRange(flight.low, flight.high);
  const returnPrice = formatPriceRange(flight.low, flight.high);

  const accomSummary = [
    result.bucket ? `${result.bucket} stay` : null,
    days ? `${days} night${days === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const defaultDailyCost = result.perDay ? euro(result.perDay) : '';

  const dayCards = Array.from({ length: days }, (_, index) => ({
    id: `day-${index + 1}`,
    type: 'day',
    title: `Day ${index + 1}`,
    subtitle: destinationCountry ?? 'Destination',
    priceLabel: defaultDailyCost,
    summary:
      index === 0
        ? 'Arrival, city orientation, highlight activity.'
        : 'Plan headline experiences, dining, and downtime.',
    fields: {
      city: destinationCountry ?? '',
      highlightAttraction: '',
      dailyCost: defaultDailyCost,
    },
    timeline: [],
    notes: '',
  }));

  const cards = [
    {
      id: 'departure-flight',
      type: 'departure',
      title: 'Departure flight',
      airports: departureAirports,
      priceLabel: departurePrice ?? 'Set price',
      summary: `${departureAirports.from} → ${departureAirports.to}`,
      fields: {
        homeAirport: departureAirports.from,
        arrivalAirport: departureAirports.to,
        baggageType: '',
        departTime: '',
        arrivalTime: '',
        bookingLink: '',
        price: departurePrice ?? '',
      },
      notes: '',
    },
    {
      id: 'accommodation',
      type: 'accommodation',
      title: 'Accommodation',
      subtitle: result.bucket ?? 'Awaiting selection',
      priceLabel: result.accom ? `${euro(result.accom)} / night` : '',
      summary: accomSummary || 'Choose ideal hotel or apartment.',
      fields: {
        lengthOfStay: days ? `${days} night${days === 1 ? '' : 's'}` : '',
        accommodationType: '',
        breakfastIncluded: '',
        bookingLink: '',
        price: result.accom ? `${euro(result.accom)} / night` : '',
      },
      notes: '',
    },
    ...dayCards,
    {
      id: 'return-flight',
      type: 'return',
      title: 'Return flight',
      airports: returnAirports,
      priceLabel: returnPrice ?? 'Set price',
      summary: `${returnAirports.from} → ${returnAirports.to}`,
      fields: {
        homeAirport: returnAirports.from,
        arrivalAirport: returnAirports.to,
        baggageType: '',
        departTime: '',
        arrivalTime: '',
        bookingLink: '',
        price: returnPrice ?? '',
      },
      notes: '',
    },
    {
      id: 'budget-summary',
      type: 'budget',
      title: 'Budget summary',
      summary: buildBudgetSummary(result, budgetTotal),
      notes: '',
    },
  ];

  return {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cards,
  };
}

function buildBudgetSummary(result, totalBudget) {
  const items = [];
  if (result?.totalLow && result?.totalHigh) {
    items.push(`Trip est. ${euro(result.totalLow)} – ${euro(result.totalHigh)}`);
  }
  if (result?.perDay) {
    items.push(`Daily spend ${euro(result.perDay)}`);
  }
  if (typeof totalBudget === 'number') {
    items.push(`Client budget ${euro(totalBudget)}`);
  }
  return items.length > 0
    ? items.join(' · ')
    : 'Outline costs vs. client budget.';
}

function euro(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `€${Math.round(value)}`;
}

function formatPriceRange(low, high) {
  const lowValid = typeof low === 'number' && !Number.isNaN(low);
  const highValid = typeof high === 'number' && !Number.isNaN(high);
  if (lowValid && highValid) {
    return `${euro(low)} – ${euro(high)}`;
  }
  if (lowValid) return euro(low);
  if (highValid) return euro(high);
  return null;
}

const TIMELINE_FIELDS = {
  transport: ['title', 'time', 'price', 'link', 'description'],
  attraction: ['title', 'time', 'price', 'link', 'description'],
  food: ['title', 'name', 'description'],
};

export function sanitizeTimeline(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => normalizeTimelineItem(item))
    .filter(Boolean);
}

function normalizeTimelineItem(item) {
  if (typeof item !== 'object' || item === null) return null;
  const type = item.type;
  if (!Object.prototype.hasOwnProperty.call(TIMELINE_FIELDS, type)) {
    return null;
  }

  const id =
    typeof item.id === 'string' && item.id.trim()
      ? item.id.trim()
      : crypto.randomUUID();

  const fields = {};
  for (const key of TIMELINE_FIELDS[type]) {
    const value = item.fields?.[key];
    fields[key] = typeof value === 'string' ? value.trim() : '';
  }

  return { id, type, fields };
}
