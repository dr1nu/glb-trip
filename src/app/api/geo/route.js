import { NextResponse } from 'next/server';

const CODE_TO_COUNTRY = {
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  IE: 'Ireland',
  FR: 'France',
  DE: 'Germany',
  IT: 'Italy',
  ES: 'Spain',
  PT: 'Portugal',
  NL: 'Netherlands',
  BE: 'Belgium',
  SE: 'Sweden',
  NO: 'Norway',
  FI: 'Finland',
  DK: 'Denmark',
  IS: 'Iceland',
  GR: 'Greece',
  TR: 'Türkiye',
  SI: 'Slovenia',
  SK: 'Slovakia',
  HR: 'Croatia',
  AT: 'Austria',
  CH: 'Switzerland',
  PL: 'Poland',
  CZ: 'Czechia',
  HU: 'Hungary',
  RO: 'Romania',
  BG: 'Bulgaria',
  RS: 'Serbia',
  BA: 'Bosnia and Herzegovina',
  AL: 'Albania',
  MK: 'North Macedonia',
  GE: 'Georgia',
  AM: 'Armenia',
  AZ: 'Azerbaijan',
  KZ: 'Kazakhstan',
  MT: 'Malta',
  CY: 'Cyprus',
  AD: 'Andorra',
  LI: 'Liechtenstein',
  LU: 'Luxembourg',
  MC: 'Monaco',
  SM: 'San Marino',
  VA: 'Vatican City',
  MD: 'Moldova',
  EE: 'Estonia',
  LV: 'Latvia',
  LT: 'Lithuania',
};

export async function GET(req) {
  const code = (req.headers.get('x-vercel-ip-country') || '').toUpperCase();
  const country = CODE_TO_COUNTRY[code] ?? null;
  return NextResponse.json({ country, code: code || null });
}
export const dynamic = 'force-dynamic';
