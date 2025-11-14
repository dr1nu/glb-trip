import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { buildProfileUpsertPayload, splitFullName } from '@/lib/profile';

function sanitizePayload(body = {}) {
  if (!body || typeof body !== 'object') {
    return {
      firstName: '',
      lastName: '',
      homeCountry: '',
      nearestAirport: '',
      travelPreferences: {},
    };
  }

  const payload = {
    firstName: typeof body.firstName === 'string' ? body.firstName : '',
    lastName: typeof body.lastName === 'string' ? body.lastName : '',
    name: typeof body.name === 'string' ? body.name : undefined,
    email: typeof body.email === 'string' ? body.email : undefined,
    homeCountry:
      typeof body.homeCountry === 'string'
        ? body.homeCountry
        : typeof body.country === 'string'
        ? body.country
        : '',
    nearestAirport:
      typeof body.nearestAirport === 'string' ? body.nearestAirport : '',
    travelPreferences:
      body.travelPreferences && typeof body.travelPreferences === 'object'
        ? body.travelPreferences
        : {},
  };

  if ((!payload.firstName || !payload.lastName) && payload.name) {
    const split = splitFullName(payload.name);
    payload.firstName = payload.firstName || split.firstName;
    payload.lastName = payload.lastName || split.lastName;
  }

  return payload;
}

export async function PUT(request) {
  let payload;
  try {
    payload = sanitizePayload(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request payload.' },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const upsertPayload = buildProfileUpsertPayload(user, payload);
  if (!upsertPayload) {
    return NextResponse.json(
      { error: 'Could not prepare profile payload.' },
      { status: 400 }
    );
  }

  const adminClient = getSupabaseAdminClient();
  const { error: upsertError } = await adminClient
    .from('profiles')
    .upsert(upsertPayload, { onConflict: 'id' });

  if (upsertError) {
    console.error('Profile upsert failed', upsertError);
    return NextResponse.json(
      {
        error:
          upsertError.message ||
          'Failed to save your profile. Please try again later.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
