import { redirect } from 'next/navigation';
import { listTrips } from '@/lib/db';
import { getAdminUser } from '@/lib/auth';
import { listTemplates } from '@/lib/templates';
import TemplatesClient from './_components/TemplatesClient';
import LogoutButton from '../_components/LogoutButton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/admin/login');
  }

  const [templates, trips] = await Promise.all([listTemplates(), listTrips()]);
  const adminInitial =
    typeof adminUser?.email === 'string' && adminUser.email.length > 0
      ? adminUser.email[0].toUpperCase()
      : 'A';

  return (
    <main className="min-h-screen">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Admin Panel</h1>
            <p className="text-sm text-slate-500">
              Manage trips, users, and templates
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
              {adminInitial}
            </div>
            <LogoutButton />
          </div>
        </div>
      </section>

      <TemplatesClient
        templates={templates}
        trips={trips}
        tripCount={trips.length}
      />
    </main>
  );
}
