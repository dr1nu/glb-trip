import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listTrips } from '@/lib/db';
import { ADMIN_COOKIE_NAME, verifySession } from '@/lib/auth';
import { listTemplates } from '@/lib/templates';
import TemplateCreator from './_components/TemplateCreator';
import TemplateList from './_components/TemplateList';
import LogoutButton from '../_components/LogoutButton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value ?? null;
  if (!verifySession(token)) {
    redirect('/admin/login');
  }

  const [templates, trips] = await Promise.all([listTemplates(), listTrips()]);

  return (
    <main className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Admin
          </p>
          <h1 className="text-2xl font-semibold">Itinerary templates</h1>
          <p className="text-sm text-neutral-400">
            Build reusable day-by-day plans keyed to each destination.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="text-sm font-medium text-neutral-300 hover:text-white"
          >
            ← Trips dashboard
          </Link>
          <LogoutButton />
        </div>
      </header>

      <TemplateCreator trips={trips} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Saved templates</h2>
          <span className="text-xs uppercase tracking-wide text-neutral-500">
            {templates.length} saved
          </span>
        </div>
        <TemplateList templates={templates} />
      </section>
    </main>
  );
}
