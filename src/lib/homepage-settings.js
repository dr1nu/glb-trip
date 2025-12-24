import { getSupabaseAdminClient } from './supabase/admin';

const TABLE = 'homepage_settings';
const DEFAULT_ID = 'primary';

export async function getHomepageSettings() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', DEFAULT_ID)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch homepage settings', error);
    throw new Error('Unable to load homepage settings.');
  }

  if (!data) {
    return { id: DEFAULT_ID, destinations: [] };
  }

  return {
    id: data.id,
    destinations: Array.isArray(data.destinations) ? data.destinations : [],
    updatedAt: data.updated_at ?? data.updatedAt ?? null,
  };
}

export async function upsertHomepageSettings(payload) {
  const supabase = getSupabaseAdminClient();
  const destinations = Array.isArray(payload?.destinations) ? payload.destinations : [];
  const now = new Date().toISOString();

  const record = {
    id: DEFAULT_ID,
    destinations,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(record, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Failed to update homepage settings', error);
    throw new Error('Unable to save homepage settings.');
  }

  return {
    id: data.id,
    destinations: Array.isArray(data.destinations) ? data.destinations : [],
    updatedAt: data.updated_at ?? data.updatedAt ?? null,
  };
}
