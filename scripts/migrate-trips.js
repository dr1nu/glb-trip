#!/usr/bin/env node
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const ENV_CANDIDATES = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
];
for (const envPath of ENV_CANDIDATES) {
  if (fsSync.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    break;
  }
}

const DATA_FILE = path.join(process.cwd(), '.data', 'trips.json');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function serializeTripPayload(trip) {
  return {
    id: trip.id,
    destination_country: trip.destinationCountry ?? null,
    home_country: trip.homeCountry ?? null,
    trip_length_days: trip.tripLengthDays ?? null,
    budget_total: trip.budgetTotal ?? null,
    result: trip.result ?? null,
    contact: trip.contact ?? null,
    itinerary: trip.itinerary ?? null,
    published: trip.published ?? false,
    created_at: trip.createdAt ?? new Date().toISOString(),
    updated_at: trip.updatedAt ?? new Date().toISOString(),
  };
}

async function loadStore() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function main() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  const supabase = createClient(url, key);
  const store = await loadStore();
  const trips = Object.values(store);
  if (trips.length === 0) {
    console.log('No local trips to migrate.');
    return;
  }

  console.log(`Migrating ${trips.length} trips to Supabase...`);
  for (const trip of trips) {
    const payload = serializeTripPayload(trip);
    const { error } = await supabase
      .from('trips')
      .upsert(payload, { onConflict: 'id' });
    if (error) {
      throw error;
    }
  }
  console.log('Migration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
