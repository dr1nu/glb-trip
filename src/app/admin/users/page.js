import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, Search } from 'lucide-react';
import { getAdminUser } from '@/lib/auth';
import { listProfiles } from '@/lib/admin-users';
import { listTrips } from '@/lib/db';
import LogoutButton from '../_components/LogoutButton';
import AdminNav from '../_components/AdminNav';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatName(profile) {
  if (!profile) return '—';
  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || profile.email || 'Unnamed user';
}

function buildUserTripStats(allTrips) {
  const map = new Map();
  allTrips.forEach((trip) => {
    const ownerId = trip.ownerId;
    if (!ownerId) return;
    const current =
      map.get(ownerId) ?? { requested: 0, pending: 0, completed: 0 };
    current.requested += 1;
    if (trip.itinerary?.cards?.length) {
      current.completed += 1;
    } else {
      current.pending += 1;
    }
    map.set(ownerId, current);
  });
  return map;
}

function buildInitials(profile) {
  const name = formatName(profile);
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }
  const email = profile?.email || '';
  return email ? email[0].toUpperCase() : 'U';
}

function formatMemberSince(value) {
  if (!value) return 'Member since —';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Member since —';
  return `Member since ${date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })}`;
}

export default async function UsersPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/admin/login');
  }

  const profiles = await listProfiles();
  const trips = await listTrips();
  const statsByOwner = buildUserTripStats(trips);
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

      <section className="mx-auto w-full max-w-6xl space-y-6 px-6 py-6">
        <div className="border-b border-slate-200 pb-4">
          <AdminNav tripCount={trips.length} />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Users</h2>
            <p className="text-sm text-slate-500">
              View all users and their trip history
            </p>
          </div>
          <label className="relative">
            <span className="sr-only">Search users</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search users..."
              className="h-11 w-72 rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 shadow-sm focus:border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </label>
        </div>

        {profiles.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            No users have created profiles yet.
          </div>
        ) : (
          <div className="space-y-4">
            {profiles.map((profile) => {
              const stats = statsByOwner.get(profile.id) ?? {
                requested: 0,
                pending: 0,
                completed: 0,
              };
              const initials = buildInitials(profile);
              const memberSince = formatMemberSince(profile.createdAt);

              return (
                <article
                  key={profile.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
                        {initials}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {formatName(profile)}
                        </h3>
                        <p className="text-sm text-slate-600">{profile.email || '—'}</p>
                        <p className="text-sm text-slate-500">{memberSince}</p>
                      </div>
                    </div>
                    <Link
                      href={`/admin?user=${profile.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
                    >
                      View Trips
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                      <div>
                        <dt className="text-sm text-slate-500">Requested</dt>
                        <dd className="mt-2 text-lg font-semibold text-slate-900">
                          {stats.requested}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-slate-500">Pending</dt>
                        <dd className="mt-2 text-lg font-semibold text-orange-600">
                          {stats.pending}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-slate-500">Completed</dt>
                        <dd className="mt-2 text-lg font-semibold text-emerald-600">
                          {stats.completed}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
