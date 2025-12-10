import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Admin login now uses Supabase email/password with the ADMIN_EMAILS allowlist. Sign in at /admin/login.',
    },
    { status: 400 }
  );
}
