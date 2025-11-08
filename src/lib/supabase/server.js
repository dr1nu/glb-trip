'use server';

import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function createSupabaseServerClient({ admin = false } = {}) {
  const cookieStore = cookies();
  const headerStore = headers();

  const supabaseKey = admin
    ? process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
      headers: {
        get(name) {
          return headerStore.get(name);
        },
      },
    }
  );
}
