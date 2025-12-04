import { NextResponse } from 'next/server';
import { getTemplate, updateTemplate } from '@/lib/templates';

export const dynamic = 'force-dynamic';

export async function GET(request, context) {
  const params = context?.params ? await context.params : {};
  const templateId = params.templateId ?? extractTemplateIdFromUrl(request.url);
  if (!templateId) {
    return NextResponse.json({ error: 'Template ID missing.' }, { status: 400 });
  }

  try {
    const template = await getTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found.' }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (err) {
    console.error('Failed to fetch template', err);
    return NextResponse.json(
      { error: 'Failed to load template.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, context) {
  const params = context?.params ? await context.params : {};
  const templateId = params.templateId ?? extractTemplateIdFromUrl(request.url);
  if (!templateId) {
    return NextResponse.json({ error: 'Template ID missing.' }, { status: 400 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload.' },
      { status: 400 }
    );
  }

  const updates = {};
  if (typeof payload?.name === 'string') updates.name = payload.name;
  if (typeof payload?.destinationCountry === 'string') {
    updates.destinationCountry = payload.destinationCountry;
  }
  if (typeof payload?.notes === 'string') updates.notes = payload.notes;
  const tripLength = Number(payload?.tripLengthDays);
  if (Number.isFinite(tripLength) && tripLength > 0) {
    updates.tripLengthDays = Math.round(tripLength);
  }

  try {
    const template = await updateTemplate(templateId, updates);
    if (!template) {
      return NextResponse.json({ error: 'Template not found.' }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (err) {
    console.error('Failed to update template', err);
    return NextResponse.json(
      { error: 'Failed to update template.' },
      { status: 500 }
    );
  }
}

function extractTemplateIdFromUrl(url) {
  try {
    const { pathname } = new URL(url, 'http://localhost');
    const parts = pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('templates');
    if (idx === -1 || idx + 1 >= parts.length) return null;
    return parts[idx + 1];
  } catch {
    return null;
  }
}
