import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifySession } from '@/lib/auth';
import { buildDefaultItinerary } from '@/lib/itinerary';
import { getTemplate } from '@/lib/templates';
import TemplateBuilderClient from './_components/TemplateBuilderClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function TemplateBuilderPage({ params }) {
  const { templateId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value ?? null;
  if (!verifySession(token)) {
    redirect('/admin/login');
  }

  const template = await getTemplate(templateId);
  if (!template) {
    notFound();
  }

  const itinerary = template.itinerary ?? buildDefaultItinerary(template);
  const cards = itinerary?.cards ?? [];

  const lengthLabel = template.tripLengthDays
    ? `${template.tripLengthDays} day${template.tripLengthDays === 1 ? '' : 's'}`
    : 'Length not set';

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#eaf3ff] via-white to-[#fffaf5] text-slate-900 p-6 flex justify-center">
      <div className="w-full max-w-4xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{template.name}</h1>
            <p className="text-sm text-[#4C5A6B] mt-1">
              {template.destinationCountry} · {lengthLabel}
            </p>
            <p className="text-xs text-[#4C5A6B] mt-2 uppercase tracking-wide">
              Template ID {template.id}
            </p>
          </div>
          <Link
            href="/admin/templates"
            className="text-sm font-medium text-orange-400 hover:text-orange-300"
          >
            ← All templates
          </Link>
        </header>

        <TemplateBuilderClient templateId={templateId} initialCards={cards} />
      </div>
    </main>
  );
}
