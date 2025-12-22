#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { HOMEPAGE_TEMPLATES } from '../src/data/homepageTemplates.js';

const ENV_CANDIDATES = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of ENV_CANDIDATES) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    break;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function countDayCards(itinerary) {
  if (!Array.isArray(itinerary?.cards)) return null;
  const count = itinerary.cards.filter((card) => card?.type === 'day').length;
  return count > 0 ? count : null;
}

async function upsertTemplate(supabase, template, destinationCountry) {
  const { name, itinerary } = template;
  const existing = await supabase
    .from('trip_templates')
    .select('id')
    .eq('name', name)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  const id = existing.data?.id ?? crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  const now = new Date().toISOString();
  const payload = {
    id,
    name,
    destination_country: destinationCountry,
    trip_length_days: countDayCards(itinerary),
    itinerary,
    notes: 'Homepage sample template',
    updated_at: now,
    ...(existing.data?.id ? {} : { created_at: now }),
  };

  const { error } = await supabase
    .from('trip_templates')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    throw error;
  }

  return id;
}

async function main() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const supabase = createClient(url, key);

  const entries = Object.entries(HOMEPAGE_TEMPLATES);
  if (entries.length === 0) {
    console.log('No homepage templates found to seed.');
    return;
  }

  console.log(`Seeding ${entries.length} homepage templates...`);
  for (const [city, template] of entries) {
    const destinationCountry = city === 'Paris' ? 'France' : city === 'Rome' ? 'Italy' : city;
    const id = await upsertTemplate(supabase, template, destinationCountry);
    console.log(`Upserted ${template.name} (${id}).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
