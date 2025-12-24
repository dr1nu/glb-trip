import crypto from 'crypto';
import { getSupabaseAdminClient } from './supabase/admin';

const TABLE = 'trips';

function generateId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}

function mapRowToTrip(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id ?? null,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    destinationCountry: row.destination_country,
    homeCountry: row.home_country,
    tripLengthDays: row.trip_length_days,
    budgetTotal: row.budget_total,
    imagePath: row.image_path ?? null,
    result: row.result ?? {},
    contact: row.contact ?? null,
    preferences: row.preferences ?? null,
    itinerary: row.itinerary ?? null,
    published: row.published ?? false,
  };
}

function serializeTripPayload(payload) {
  if (!payload || typeof payload !== 'object') return {};
  const serialized = {};
  if (payload.destinationCountry !== undefined) {
    serialized.destination_country = payload.destinationCountry;
  }
  if (payload.homeCountry !== undefined) {
    serialized.home_country = payload.homeCountry;
  }
  if (payload.tripLengthDays !== undefined) {
    serialized.trip_length_days = payload.tripLengthDays;
  }
  if (payload.budgetTotal !== undefined) {
    serialized.budget_total = payload.budgetTotal;
  }
  if (payload.imagePath !== undefined) {
    serialized.image_path = payload.imagePath;
  }
  if (payload.result !== undefined) {
    serialized.result = payload.result;
  }
  if (payload.contact !== undefined) {
    serialized.contact = payload.contact;
  }
  if (payload.preferences !== undefined) {
    serialized.preferences = payload.preferences;
  }
  if (payload.itinerary !== undefined) {
    serialized.itinerary = payload.itinerary;
  }
  if (payload.published !== undefined) {
    serialized.published = payload.published;
  }
  return serialized;
}

export async function createTrip(payload, ownerId = null) {
  const supabase = getSupabaseAdminClient();
  const id = generateId();
  const serialized = serializeTripPayload(payload);
  const record = {
    id,
    owner_id: ownerId ?? null,
    ...serialized,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Failed to create trip', error);
    throw new Error('Unable to create trip.');
  }

  return mapRowToTrip(data);
}

export async function getTrip(id) {
  if (!id) return null;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Failed to fetch trip', error);
    throw new Error('Unable to fetch trip.');
  }

  return mapRowToTrip(data);
}

export async function updateTrip(id, updates) {
  if (!id) throw new Error('Trip ID is required to update.');
  if (typeof updates !== 'object' || updates === null) {
    throw new Error('Updates must be an object.');
  }

  const supabase = getSupabaseAdminClient();
  const serialized = serializeTripPayload(updates);
  if (Object.keys(serialized).length === 0) {
    return getTrip(id);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      ...serialized,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Failed to update trip', error);
    throw new Error('Unable to update trip.');
  }

  return mapRowToTrip(data);
}

export async function listTrips() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to list trips', error);
    throw new Error('Unable to load trips.');
  }

  return (data ?? []).map(mapRowToTrip);
}

export async function listTripsByOwner(ownerId) {
  if (!ownerId) return [];
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to list trips for user', error);
    throw new Error('Unable to load trips.');
  }

  return (data ?? []).map(mapRowToTrip);
}

export async function deleteTrip(id) {
  if (!id) throw new Error('Trip ID is required to delete.');
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Failed to delete trip', error);
    throw new Error('Unable to delete trip.');
  }

  return mapRowToTrip(data);
}
