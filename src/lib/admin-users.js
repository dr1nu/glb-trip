import { getSupabaseAdminClient } from './supabase/admin';

const TABLE = 'profiles';

function mapRowToProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    email: row.email ?? '',
    createdAt: row.created_at ?? null,
  };
}

export async function listProfiles() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, first_name, last_name, email, created_at');

  if (error) {
    console.error('Failed to list profiles', error);
    throw new Error('Unable to load users.');
  }

  return (data ?? []).map(mapRowToProfile).filter(Boolean);
}
