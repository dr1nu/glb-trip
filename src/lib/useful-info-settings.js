import {
  CITY_TRANSPORT_CARDS,
  COUNTRY_TRANSPORT_SITES,
  COUNTRY_USEFUL_INFO,
} from '@/data/destinationUsefulInfo';
import { getSupabaseAdminClient } from './supabase/admin';

const TABLE = 'useful_info_settings';
const DEFAULT_ID = 'primary';

export async function getUsefulInfoSettings() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', DEFAULT_ID)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch useful info settings', error);
    throw new Error('Unable to load useful info settings.');
  }

  if (!data) {
    return {
      id: DEFAULT_ID,
      cityTransport: CITY_TRANSPORT_CARDS,
      countryInfo: COUNTRY_USEFUL_INFO,
      countryTransportSites: COUNTRY_TRANSPORT_SITES,
    };
  }

  return {
    id: data.id,
    cityTransport: Array.isArray(data.city_transport) ? data.city_transport : CITY_TRANSPORT_CARDS,
    countryInfo: Array.isArray(data.country_info) ? data.country_info : COUNTRY_USEFUL_INFO,
    countryTransportSites: Array.isArray(data.country_transport_sites)
      ? data.country_transport_sites
      : COUNTRY_TRANSPORT_SITES,
    updatedAt: data.updated_at ?? data.updatedAt ?? null,
  };
}

export async function upsertUsefulInfoSettings(payload) {
  const supabase = getSupabaseAdminClient();
  const cityTransport = Array.isArray(payload?.cityTransport) ? payload.cityTransport : [];
  const countryInfo = Array.isArray(payload?.countryInfo) ? payload.countryInfo : [];
  const countryTransportSites = Array.isArray(payload?.countryTransportSites)
    ? payload.countryTransportSites
    : [];
  const now = new Date().toISOString();

  const record = {
    id: DEFAULT_ID,
    city_transport: cityTransport,
    country_info: countryInfo,
    country_transport_sites: countryTransportSites,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(record, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Failed to update useful info settings', error);
    throw new Error('Unable to save useful info settings.');
  }

  return {
    id: data.id,
    cityTransport: Array.isArray(data.city_transport) ? data.city_transport : [],
    countryInfo: Array.isArray(data.country_info) ? data.country_info : [],
    countryTransportSites: Array.isArray(data.country_transport_sites)
      ? data.country_transport_sites
      : [],
    updatedAt: data.updated_at ?? data.updatedAt ?? null,
  };
}
