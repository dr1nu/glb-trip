import { NextResponse } from 'next/server';
import { getTrip, updateTrip } from '@/lib/db';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'trip-country-images';

function cleanPath(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeFileName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    return `image-${Date.now()}.jpg`;
  }
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/\.{2,}/g, '.');
}

async function assertTrip(tripId) {
  const trip = await getTrip(tripId);
  if (!trip) {
    return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
  }
  return trip;
}

export async function POST(request, context) {
  let tripId = context?.params?.tripId;

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  tripId = tripId || cleanPath(body?.tripId);

  if (!tripId) {
    return NextResponse.json({ error: 'Trip ID missing from request.' }, { status: 400 });
  }

  const trip = await assertTrip(tripId);
  if (trip instanceof Response) return trip;

  const imagePath = cleanPath(body?.imagePath);

  try {
    const updated = await updateTrip(tripId, { imagePath });
    if (!updated) {
      return NextResponse.json({ error: 'Unable to update trip.' }, { status: 500 });
    }
    return NextResponse.json({ imagePath: updated.imagePath ?? null });
  } catch (err) {
    console.error('Failed to save trip image', err);
    return NextResponse.json({ error: 'Failed to save image path.' }, { status: 500 });
  }
}

export async function PUT(request, context) {
  const tripId = context?.params?.tripId ?? null;
  const hasTrip = Boolean(tripId);
  const trip = hasTrip ? await assertTrip(tripId) : null;
  if (trip instanceof Response) return trip;

  let file;
  let country;

  try {
    const form = await request.formData();
    file = form.get('file');
    country = cleanPath(form.get('country'));
  } catch {
    return NextResponse.json({ error: 'Invalid upload payload.' }, { status: 400 });
  }

  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'File is required for upload.' }, { status: 400 });
  }
  if (!country) {
    return NextResponse.json({ error: 'Country folder is required.' }, { status: 400 });
  }

  const safeName = sanitizeFileName(file.name || 'image.jpg');
  const path = `${country}/${safeName}`;

  try {
    const adminClient = getSupabaseAdminClient();
    const { error } = await adminClient.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'application/octet-stream',
      });

    if (error) {
      console.error('Supabase upload failed', error);
      return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
    }

    if (hasTrip) {
      const updated = await updateTrip(tripId, { imagePath: path });
      if (!updated) {
        return NextResponse.json({ error: 'Unable to update trip.' }, { status: 500 });
      }
    }

    return NextResponse.json({ imagePath: path });
  } catch (err) {
    console.error('Failed to upload image', err);
    return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
  }
}
