import { NextResponse } from 'next/server';
import { getHomepageSettings, upsertHomepageSettings } from '@/lib/homepage-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getHomepageSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error('Failed to load homepage settings', err);
    return NextResponse.json(
      { error: 'Failed to load homepage settings.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload.' },
      { status: 400 }
    );
  }

  try {
    const settings = await upsertHomepageSettings(payload);
    return NextResponse.json(settings);
  } catch (err) {
    console.error('Failed to update homepage settings', err);
    return NextResponse.json(
      { error: 'Failed to save homepage settings.' },
      { status: 500 }
    );
  }
}
