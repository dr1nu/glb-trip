import crypto from 'crypto';
import { getSupabaseAdminClient } from './supabase/admin';

const TABLE = 'trip_templates';

function generateId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}

function mapRowToTemplate(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    destinationCountry: row.destination_country,
    tripLengthDays: row.trip_length_days,
    sourceTripId: row.source_trip_id ?? null,
    notes: row.notes ?? null,
    itinerary: row.itinerary ?? null,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

function serializeTemplatePayload(payload) {
  if (!payload || typeof payload !== 'object') return {};
  const serialized = {};
  if (payload.name !== undefined) serialized.name = payload.name;
  if (payload.destinationCountry !== undefined) {
    serialized.destination_country = payload.destinationCountry;
  }
  if (payload.tripLengthDays !== undefined) {
    serialized.trip_length_days = payload.tripLengthDays;
  }
  if (payload.sourceTripId !== undefined) {
    serialized.source_trip_id = payload.sourceTripId;
  }
  if (payload.notes !== undefined) serialized.notes = payload.notes;
  if (payload.itinerary !== undefined) serialized.itinerary = payload.itinerary;
  return serialized;
}

export async function createTemplate(payload) {
  if (!payload?.name) {
    throw new Error('Template name is required.');
  }
  if (!payload?.destinationCountry) {
    throw new Error('Template destinationCountry is required.');
  }

  const supabase = getSupabaseAdminClient();
  const id = generateId();
  const serialized = serializeTemplatePayload(payload);
  const record = {
    id,
    ...serialized,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Failed to create template', error);
    throw new Error('Unable to create template.');
  }

  return mapRowToTemplate(data);
}

export async function getTemplate(id) {
  if (!id) return null;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Failed to fetch template', error);
    throw new Error('Unable to fetch template.');
  }

  return mapRowToTemplate(data);
}

export async function updateTemplate(id, updates) {
  if (!id) throw new Error('Template ID is required to update.');
  if (typeof updates !== 'object' || updates === null) {
    throw new Error('Updates must be an object.');
  }

  const supabase = getSupabaseAdminClient();
  const serialized = serializeTemplatePayload(updates);
  if (Object.keys(serialized).length === 0) {
    return getTemplate(id);
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
    if (error.code === 'PGRST116') return null;
    console.error('Failed to update template', error);
    throw new Error('Unable to update template.');
  }

  return mapRowToTemplate(data);
}

export async function listTemplates(filters = {}) {
  const supabase = getSupabaseAdminClient();
  let query = supabase.from(TABLE).select('*').order('created_at', { ascending: false });

  if (filters.destinationCountry) {
    query = query.eq('destination_country', filters.destinationCountry);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to list templates', error);
    throw new Error('Unable to load templates.');
  }

  return (data ?? []).map(mapRowToTemplate);
}

export async function deleteTemplate(id) {
  if (!id) throw new Error('Template ID is required to delete.');
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) {
    console.error('Failed to delete template', error);
    throw new Error('Unable to delete template.');
  }
  return true;
}
