import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Admin logout now happens via Supabase auth; call supabase.auth.signOut() client-side.',
    },
    { status: 400 }
  );
}
