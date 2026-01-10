import { NextResponse } from 'next/server';
import { getUsefulInfoSettings, upsertUsefulInfoSettings } from '@/lib/useful-info-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getUsefulInfoSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error('Failed to load useful info settings', err);
    return NextResponse.json(
      { error: 'Failed to load useful info settings.' },
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
    const settings = await upsertUsefulInfoSettings(payload);
    return NextResponse.json(settings);
  } catch (err) {
    console.error('Failed to update useful info settings', err);
    return NextResponse.json(
      { error: 'Failed to save useful info settings.' },
      { status: 500 }
    );
  }
}
