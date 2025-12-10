import { createSupabaseServerClient } from './supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function hasAdminEmail(user) {
  if (!user?.email) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
}

function hasAdminRole(user) {
  const meta = user?.app_metadata ?? user?.appMetadata ?? {};
  if (!meta) return false;
  if (typeof meta.role === 'string' && meta.role.toLowerCase() === 'admin') {
    return true;
  }
  if (Array.isArray(meta.roles)) {
    return meta.roles.map((r) => String(r).toLowerCase()).includes('admin');
  }
  return false;
}

export function isAdminUser(user) {
  return hasAdminEmail(user) || hasAdminRole(user);
}

export async function getAdminUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Failed to read auth session', error);
      return null;
    }
    const user = data?.user ?? null;
    if (!user) return null;
    return isAdminUser(user) ? user : null;
  } catch (err) {
    console.error('Failed to resolve admin user', err);
    return null;
  }
}

export async function requireAdminUser() {
  const user = await getAdminUser();
  if (!user) {
    throw new Error('Admin access denied.');
  }
  return user;
}
