import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import {
  buildDefaultItinerary,
  extractDayCards,
  extractUnassignedActivities,
} from '@/lib/itinerary';
import { getTemplate } from '@/lib/templates';
import TemplateBuilderClient from './_components/TemplateBuilderClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function TemplateBuilderPage({ params }) {
  const { templateId } = await params;
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/admin/login');
  }

  const template = await getTemplate(templateId);
  if (!template) {
    notFound();
  }

  const itinerary = template.itinerary ?? buildDefaultItinerary(template);
  const cards = extractDayCards(itinerary);
  const unassignedActivities = extractUnassignedActivities(itinerary);

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

        <TemplateBuilderClient
          templateId={templateId}
          initialCards={cards}
          initialActivities={unassignedActivities}
        />
      </div>
    </main>
  );
}
