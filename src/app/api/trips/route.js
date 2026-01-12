import { NextResponse } from 'next/server';
import { createTrip, getTrip, listTrips, listTripsByOwner } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { splitFullName } from '@/lib/profile';

export const dynamic = 'force-dynamic';

const BILLING_CURRENCY = 'EUR';
const RATE_PER_DAY_CENTS = 300;
const TRIP_IMAGE_BUCKET = 'trip-country-images';
const ANYWHERE_FOLDER = 'Anywhere';

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSegment(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeFilename(value) {
  const base = cleanString(value).replace(/\.[^/.]+$/, '');
  return normalizeSegment(base);
}

async function listImagesInFolder(storage, folder) {
  if (!folder) return [];
  const { data, error } = await storage
    .from(TRIP_IMAGE_BUCKET)
    .list(folder, { limit: 200, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw error;
  return (data ?? [])
    .filter((entry) => entry?.name && !entry.name.endsWith('/'))
    .map((entry) => `${folder}/${entry.name}`);
}

async function findMatchingFolder(storage, country) {
  const folder = cleanString(country);
  if (!folder) return { folder: '', paths: [] };
  let paths = await listImagesInFolder(storage, folder);
  if (paths.length > 0) return { folder, paths };

  const { data: root, error } = await storage
    .from(TRIP_IMAGE_BUCKET)
    .list('', { limit: 200, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw error;

  const match = (root ?? []).find((entry) => {
    if (!entry?.name) return false;
    return entry.name.toLowerCase() === folder.toLowerCase();
  });
  if (!match?.name) return { folder, paths: [] };

  paths = await listImagesInFolder(storage, match.name);
  return { folder: match.name, paths };
}

async function pickTripImagePath({ storage, destinationCountry, destinationCity }) {
  const country = cleanString(destinationCountry);
  const city = cleanString(destinationCity);
  const isAnywhere = country.toLowerCase() === 'anywhere';

  let paths = [];
  if (isAnywhere) {
    paths = await listImagesInFolder(storage, ANYWHERE_FOLDER);
  } else {
    const { paths: countryPaths } = await findMatchingFolder(storage, country);
    paths = countryPaths;
    if (paths.length === 0) {
      paths = await listImagesInFolder(storage, ANYWHERE_FOLDER);
    }
  }

  if (paths.length === 0) return null;
  if (!isAnywhere && city) {
    const prefix = `${normalizeSegment(country)}-${normalizeSegment(city)}-`;
    const matched = paths.find((path) => {
      const fileName = path.split('/').pop() ?? '';
      const normalized = normalizeFilename(fileName);
      return normalized.startsWith(prefix);
    });
    if (matched) return matched;
  }

  return paths[Math.floor(Math.random() * paths.length)];
}

function normalizePayload(data) {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Body must be an object.');
  }

  const {
    destinationCountry,
    homeCountry,
    tripLengthDays,
    budgetTotal,
    result,
    contact,
    preferences,
    imagePath,
  } = data;

  if (!destinationCountry || typeof destinationCountry !== 'string') {
    throw new Error('destinationCountry is required.');
  }
  if (!homeCountry || typeof homeCountry !== 'string') {
    throw new Error('homeCountry is required.');
  }

  const days = Number(tripLengthDays);
  if (!Number.isFinite(days) || days < 1) {
    throw new Error('tripLengthDays must be a positive number.');
  }

  const budget = Number(budgetTotal);
  if (!Number.isFinite(budget) || budget < 0) {
    throw new Error('budgetTotal must be a non-negative number.');
  }

  if (typeof contact !== 'object' || contact === null) {
    throw new Error('contact information is required.');
  }

  const email = cleanString(contact.email);
  const fullName = cleanString(contact.name);
  let firstName = cleanString(contact.firstName);
  let lastName = cleanString(contact.lastName);
  if ((!firstName || !lastName) && fullName) {
    const split = splitFullName(fullName);
    firstName = firstName || split.firstName;
    lastName = lastName || split.lastName;
  }
  if (!firstName) throw new Error('Contact first name is required.');
  if (!lastName) throw new Error('Contact surname is required.');
  if (!email) throw new Error('Contact email is required.');

  const contactHomeCountry =
    cleanString(contact.homeCountry) ||
    cleanString(contact.country) ||
    cleanString(contact.city);
  if (!contactHomeCountry) {
    throw new Error('Contact home country is required.');
  }
  const nearestAirport = cleanString(contact.nearestAirport);
  if (!nearestAirport) {
    throw new Error('Contact nearest airport is required.');
  }

  const adultsRaw = Number(contact.adults);
  const adults = Number.isFinite(adultsRaw) && adultsRaw >= 1 ? Math.floor(adultsRaw) : 1;
  const childrenRaw = Number(contact.children);
  const children =
    Number.isFinite(childrenRaw) && childrenRaw >= 0 ? Math.floor(childrenRaw) : 0;
  const details =
    typeof contact.details === 'string' ? contact.details.trim() : '';
  const imagePathClean =
    typeof imagePath === 'string' && imagePath.trim().length > 0
      ? imagePath.trim()
      : null;

  return {
    destinationCountry,
    homeCountry,
    tripLengthDays: days,
    budgetTotal: budget,
    result: typeof result === 'object' && result !== null ? result : {},
    contact: {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email,
      homeCountry: contactHomeCountry,
      nearestAirport,
      adults,
      children,
      details,
    },
    preferences:
      typeof preferences === 'object' && preferences !== null ? preferences : null,
    imagePath: imagePathClean,
  };
}

export async function POST(request) {
  let payload;
  let rawPayload;
  try {
    rawPayload = await request.json();
    payload = normalizePayload(rawPayload);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid body.' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to request a trip.' },
        { status: 401 }
      );
    }

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const existingTrips = await listTripsByOwner(user.id);
    const hasFreeThisYear = existingTrips.some((trip) => {
      if (trip.billingFreeYear === currentYear) return true;
      if (trip.billingStatus === 'free') {
        if (!trip.createdAt) return false;
        const createdYear = new Date(trip.createdAt).getUTCFullYear();
        return createdYear === currentYear;
      }
      return false;
    });
    const isFreeTrip = !hasFreeThisYear;
    const baseAmountCents = Math.max(
      0,
      Math.round(payload.tripLengthDays * RATE_PER_DAY_CENTS)
    );
    let resolvedImagePath = payload.imagePath;
    if (!resolvedImagePath) {
      try {
        const adminClient = getSupabaseAdminClient();
        resolvedImagePath = await pickTripImagePath({
          storage: adminClient.storage,
          destinationCountry: payload.destinationCountry,
          destinationCity: cleanString(rawPayload?.destinationCity),
        });
      } catch (err) {
        console.warn('Failed to auto-select trip image', err);
      }
    }

    const trip = await createTrip(
      {
        ...payload,
        imagePath: resolvedImagePath,
        billingStatus: isFreeTrip ? 'free' : 'pending',
        billingCurrency: BILLING_CURRENCY,
        billingAmountCents: isFreeTrip ? 0 : baseAmountCents,
        billingFreeYear: isFreeTrip ? currentYear : null,
      },
      user.id
    );
    return NextResponse.json({ tripId: trip.id });
  } catch (err) {
    console.error('Failed to create trip', err);
    return NextResponse.json(
      { error: 'Failed to persist trip.' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('tripId') ?? searchParams.get('id');

  try {
    if (id) {
      const trip = await getTrip(id);
      if (!trip) {
        return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
      }
      return NextResponse.json({ trip });
    }

    const trips = await listTrips();
    return NextResponse.json({ trips });
  } catch (err) {
    console.error('Failed to read trip(s)', err);
    return NextResponse.json(
      { error: 'Failed to load trips.' },
      { status: 500 }
    );
  }
}
