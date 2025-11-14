import { mergeTravelPreferences } from './travel-preferences';

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function splitFullName(value = '') {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function composeProfilePayload(user, overrides = {}) {
  const metadata = user?.user_metadata ?? {};
  const overrideName = cleanString(overrides.name);
  const derivedOverride = overrideName ? splitFullName(overrideName) : null;
  const derivedMeta = splitFullName(cleanString(metadata.name));

  const firstName =
    cleanString(overrides.firstName) ||
    derivedOverride?.firstName ||
    cleanString(metadata.firstName) ||
    derivedMeta.firstName ||
    '';

  const lastName =
    cleanString(overrides.lastName) ||
    derivedOverride?.lastName ||
    cleanString(metadata.lastName) ||
    derivedMeta.lastName ||
    '';

  const homeCountry =
    cleanString(overrides.homeCountry) ||
    cleanString(metadata.homeCountry) ||
    cleanString(metadata.country) ||
    '';

  const nearestAirport =
    cleanString(overrides.nearestAirport) ||
    cleanString(metadata.nearestAirport) ||
    '';

  const travelPreferences = mergeTravelPreferences(
    overrides.travelPreferences ?? metadata.travelPreferences
  );

  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return {
    user: user ?? null,
    firstName,
    lastName,
    fullName,
    email: cleanString(overrides.email) || user?.email || '',
    homeCountry,
    nearestAirport,
    travelPreferences,
  };
}

export function buildProfileUpsertPayload(user, overrides = {}) {
  if (!user) return null;
  const profile = composeProfilePayload(user, overrides);
  return {
    id: user.id,
    first_name: profile.firstName,
    last_name: profile.lastName,
    home_country: profile.homeCountry,
    nearest_airport: profile.nearestAirport,
    travel_preferences: profile.travelPreferences,
    email: profile.email,
  };
}
