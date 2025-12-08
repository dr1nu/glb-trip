'use strict';

import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function createSupabaseServerClient({ admin = false } = {}) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = admin
    ? process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase environment variables are missing. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (and SUPABASE_SERVICE_ROLE_KEY for admin) are set.'
    );
  }

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

  return createServerClient(supabaseUrl, supabaseKey, {
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
  });
}
