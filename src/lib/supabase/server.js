'use strict';

import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function createSupabaseServerClient({ admin = false } = {}) {
  let headerStore;
  let cookieStore;

  try {
    headerStore = await headers();
  } catch {
    headerStore = new Headers();
  }

  try {
    cookieStore = await cookies();
  } catch {
    cookieStore = {
      get() {
        return undefined;
      },
    };
  }

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
          return (cookieStore?.get?.(name) ?? undefined)?.value ?? undefined;
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
