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
