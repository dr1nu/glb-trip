import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import { listProfiles } from '@/lib/admin-users';
import { listTripsByOwner } from '@/lib/db';
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

function formatDate(iso) {
  if (!iso) return 'unknown';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function UsersPage({ searchParams }) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/admin/login');
  }

  const profiles = await listProfiles();
  const resolvedSearchParams = await searchParams;
  const selectedId =
    typeof resolvedSearchParams?.user === 'string' ? resolvedSearchParams.user : '';
  const selectedProfile = profiles.find((profile) => profile.id === selectedId) ?? null;
  const trips = selectedId ? await listTripsByOwner(selectedId) : [];

  return (
    <main className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Admin
          </p>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-neutral-400">
            Browse customer accounts and see their trips.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminNav />
          <LogoutButton />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              User list
            </h2>
            <span className="text-xs text-neutral-500">{profiles.length} total</span>
          </div>
          {profiles.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-sm text-neutral-300 text-center">
              No users have created profiles yet.
            </div>
          ) : (
            <div className="space-y-2">
              {profiles.map((profile) => {
                const isActive = profile.id === selectedId;
                return (
                  <Link
                    key={profile.id}
                    href={`/admin/users?user=${profile.id}`}
                    className={`block rounded-2xl border px-4 py-3 transition ${
                      isActive
                        ? 'border-orange-500/70 bg-orange-500/10 text-orange-100'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-neutral-600'
                    }`}
                  >
                    <div className="text-sm font-semibold">{formatName(profile)}</div>
                    <div className="text-xs text-neutral-400">{profile.email || '—'}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          {!selectedProfile ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-sm text-neutral-300 text-center">
              Select a user to see their trips.
            </div>
          ) : (
            <>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                <div className="text-xs uppercase tracking-wide text-neutral-500">
                  Selected user
                </div>
                <div className="text-lg font-semibold text-neutral-100">
                  {formatName(selectedProfile)}
                </div>
                <div className="text-sm text-neutral-300">
                  {selectedProfile.email || '—'}
                </div>
                <div className="text-xs text-neutral-500 mt-2">
                  User ID: {selectedProfile.id}
                </div>
              </div>

              {trips.length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-sm text-neutral-300 text-center">
                  No trips saved for this user yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {trips.map((trip) => (
                    <article
                      key={trip.id}
                      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">
                            {trip.homeCountry || 'Home'} →{' '}
                            {trip.destinationCountry || 'Destination'}
                          </div>
                          <div className="text-xs text-neutral-400">
                            Generated {formatDate(trip.createdAt)} · {trip.tripLengthDays} day
                            {trip.tripLengthDays === 1 ? '' : 's'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/trip/${trip.id}?from=admin`}
                            className="text-sm font-medium text-orange-300 hover:text-orange-200"
                          >
                            View trip →
                          </Link>
                          {trip.itinerary?.cards?.length ? (
                            <Link
                              href={`/trip/${trip.id}/builder?from=admin`}
                              className="text-sm font-medium text-orange-300 hover:text-orange-200"
                            >
                              Open builder →
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
