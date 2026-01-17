import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listTrips } from '@/lib/db';
import { getAdminUser } from '@/lib/auth';
import { Search } from 'lucide-react';
import LogoutButton from './_components/LogoutButton';
import AdminNav from './_components/AdminNav';
import DeleteTripButton from './_components/DeleteTripButton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatDate(iso) {
  if (!iso) return 'unknown';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function euro(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `€${Math.round(value)}`;
}

export default async function AdminPage({ searchParams }) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/admin/login');
  }

  const trips = await listTrips();
  const query = (await searchParams) ?? {};
  const selectedUserId =
    typeof query.user === 'string' && query.user.trim() ? query.user.trim() : '';
  const visibleTrips = selectedUserId
    ? trips.filter((trip) => trip.ownerId === selectedUserId)
    : trips;
  const locationFilter =
    typeof query.location === 'string' ? query.location.trim() : '';
  const lengthFilterRaw = Number(query.length);
  const lengthFilter =
    Number.isFinite(lengthFilterRaw) && lengthFilterRaw > 0
      ? Math.round(lengthFilterRaw)
      : null;
  const costFilterRaw = Number(query.cost);
  const costFilter =
    Number.isFinite(costFilterRaw) && costFilterRaw > 0
      ? Math.round(costFilterRaw)
      : null;
  const statusFilter =
    typeof query.status === 'string' && query.status.trim()
      ? query.status.trim()
      : '';
  const sort =
    typeof query.sort === 'string' && query.sort.trim()
      ? query.sort.trim()
      : 'newest';
  const locationOptions = Array.from(
    new Set(
      visibleTrips
        .map((trip) => trip.destinationCountry)
        .filter((value) => typeof value === 'string' && value.trim())
    )
  ).sort((a, b) => a.localeCompare(b));

  const filteredTrips = visibleTrips.filter((trip) => {
    if (locationFilter) {
      const needle = locationFilter.toLowerCase();
      const destination = (trip.destinationCountry || '').toLowerCase();
      const home = (trip.homeCountry || '').toLowerCase();
      if (!destination.includes(needle) && !home.includes(needle)) {
        return false;
      }
    }
    if (lengthFilter) {
      const length = Number(trip.tripLengthDays);
      if (!Number.isFinite(length) || Math.round(length) < lengthFilter) {
        return false;
      }
    }
    if (costFilter) {
      const estimatedCost = Math.max(
        0,
        Math.round((trip.tripLengthDays ?? 0) * 300)
      );
      if (estimatedCost < costFilter) {
        return false;
      }
    }
    if (statusFilter) {
      const hasItinerary = Boolean(trip.itinerary?.cards?.length);
      if (statusFilter === 'needs_itinerary' && hasItinerary) {
        return false;
      }
      if (statusFilter === 'completed' && !hasItinerary) {
        return false;
      }
      if (statusFilter === 'published' && !trip.published) {
        return false;
      }
    }
    return true;
  });

  const sortedTrips = [...filteredTrips].sort((a, b) => {
    if (sort === 'oldest') {
      return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
    }
    if (sort === 'az') {
      return (a.destinationCountry || '').localeCompare(b.destinationCountry || '');
    }
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });

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
            <h2 className="text-lg font-semibold text-slate-900">Trip Requests</h2>
            <p className="text-sm text-slate-500">
              Manage and review trip requests from users
            </p>
          </div>
          <form method="GET" className="flex flex-wrap items-center gap-3">
            {selectedUserId ? (
              <input type="hidden" name="user" value={selectedUserId} />
            ) : null}
            <label className="relative">
              <span className="sr-only">Filter by location</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                name="location"
                defaultValue={locationFilter}
                className="h-11 w-56 rounded-2xl border border-slate-200 bg-white pl-10 pr-8 text-sm text-slate-700 shadow-sm focus:border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="">All locations</option>
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>
            <input
              type="number"
              name="length"
              min="1"
              defaultValue={lengthFilter ?? ''}
              placeholder="Min days"
              className="h-11 w-36 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
            <input
              type="number"
              name="cost"
              min="0"
              defaultValue={costFilter ?? ''}
              placeholder="Min cost (€)"
              className="h-11 w-40 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
            <select
              name="status"
              defaultValue={statusFilter}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-100"
            >
              <option value="">All statuses</option>
              <option value="needs_itinerary">Needs itinerary</option>
              <option value="completed">Completed trips</option>
              <option value="published">Published to user</option>
            </select>
            <select
              name="sort"
              defaultValue={sort}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-100"
            >
              <option value="newest">Sort Newest to Oldest</option>
              <option value="oldest">Sort Oldest to Newest</option>
              <option value="az">Sort A to Z</option>
            </select>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-400"
            >
              Apply
            </button>
          </form>
        </div>

        {sortedTrips.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            {selectedUserId
              ? 'No trips saved for this user yet.'
              : locationFilter || lengthFilter || costFilter || statusFilter
                ? 'No trips match the current filters.'
                : 'Generate a trip from the homepage to see it appear here.'}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTrips.map((trip) => {
              const {
                id,
                createdAt,
                destinationCountry,
                homeCountry,
                tripLengthDays,
                budgetTotal,
                itinerary = null,
                preferences = null,
                contact = null,
              } = trip;

              const itineraryReady = Boolean(itinerary?.cards?.length);
              const statusLabel = itineraryReady ? 'Builder ready' : 'Needs itinerary';
              const statusTone = itineraryReady
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700';
              const travellerSummary = formatTravellerCount(contact);
              const { departureLabel, returnLabel, durationLabel } =
                formatDepartureReturn(preferences, tripLengthDays);
              const travellerName =
                contact?.name ||
                [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') ||
                'Traveller pending';
              const travellerEmail = contact?.email || 'Email pending';
              const preferenceLabel = formatPreferences(preferences);
              const rentCarLabel = formatYesNo(preferences?.rentCarSelfDrive);
              const dayTripsLabel = formatDayTrips(preferences);

              return (
                <article
                  key={id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {homeCountry} → {destinationCountry}
                        </h3>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        {travellerName}
                      </p>
                      <p className="text-sm text-slate-500">{travellerEmail}</p>
                      <p className="text-xs text-slate-400">
                        Submitted {formatDate(createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {itineraryReady ? (
                        <Link
                          href={`/trip/${id}/builder?from=admin`}
                          className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-orange-400"
                        >
                          Open builder
                        </Link>
                      ) : (
                        <Link
                          href={`/trip/${id}/builder?from=admin`}
                          className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-orange-400"
                        >
                          Review &amp; build
                        </Link>
                      )}
                      {itineraryReady ? (
                        <Link
                          href={`/trip/${id}/builder?from=admin`}
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-[1px] hover:border-orange-200 hover:text-[#C2461E]"
                        >
                          Review request
                        </Link>
                      ) : null}
                      <DeleteTripButton tripId={id} />
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <SummaryItem
                        label="Destination"
                        value={`${homeCountry} → ${destinationCountry}`}
                      />
                      <SummaryItem label="Travellers" value={travellerSummary} />
                      <SummaryItem label="Budget" value={euro(budgetTotal)} />
                      <SummaryItem
                        label="Itinerary"
                        value={
                          itineraryReady
                            ? `${itinerary.cards.length} cards`
                            : 'Not created'
                        }
                      />
                    </dl>

                    <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <DateFact
                        label="Departure date"
                        value={departureLabel}
                        returnLabel={returnLabel}
                        durationLabel={durationLabel}
                      />
                      <SummaryItem label="Preferences" value={preferenceLabel} />
                      <SummaryItem label="Self-drive rental" value={rentCarLabel} />
                      <SummaryItem label="Day trips" value={dayTripsLabel} />
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

function SummaryItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function DateFact({ label, value, returnLabel, durationLabel }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
      <div className="mt-2 text-xs text-slate-500">
        <div>Return: {returnLabel}</div>
        <div>Duration: {durationLabel}</div>
      </div>
    </div>
  );
}

function formatTravellerCount(contact) {
  if (!contact) return 'Traveller details pending';
  const adults = typeof contact.adults === 'number' ? contact.adults : null;
  const children = typeof contact.children === 'number' ? contact.children : 0;
  if (adults === null) return 'Traveller details pending';
  const adultLabel = `${adults} adult${adults === 1 ? '' : 's'}`;
  const childLabel =
    children > 0 ? ` · ${children} child${children === 1 ? '' : 'ren'}` : '';
  return `${adultLabel}${childLabel}`;
}

function formatPreferences(preferences) {
  const interests = Array.isArray(preferences?.interests)
    ? preferences.interests.filter(Boolean)
    : [];
  if (interests.length > 0) return interests.join(', ');
  if (typeof preferences?.preferences === 'string' && preferences.preferences.trim()) {
    return preferences.preferences.trim();
  }
  return 'No preferences listed';
}

function formatDepartureReturn(preferences, tripLengthDays) {
  const durationLabel = formatDuration(tripLengthDays, preferences);
  if (!preferences) {
    return {
      departureLabel: 'Dates not provided',
      returnLabel: 'Return date not provided',
      durationLabel,
    };
  }

  const { travelWindow, dateFrom, dateTo, flexibleMonth, flexibleDays, rangeDays } =
    preferences;

  if (travelWindow === 'flexible') {
    const flexibleDuration =
      formatFlexibleDuration({ flexibleDays, rangeDays }) || durationLabel;
    if (flexibleMonth) {
      const parsed = new Date(`${flexibleMonth}-01`);
      if (!Number.isNaN(parsed.getTime())) {
        const monthLabel = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          year: 'numeric',
        }).format(parsed);
        return {
          departureLabel: `Flexible in ${monthLabel}`,
          returnLabel: 'Flexible return',
          durationLabel: flexibleDuration,
        };
      }
    }
    return {
      departureLabel: 'Flexible dates',
      returnLabel: 'Flexible return',
      durationLabel: flexibleDuration,
    };
  }

  if ((travelWindow === 'range' || travelWindow === 'specific') && dateFrom && dateTo) {
    return {
      departureLabel: formatDateLabel(dateFrom),
      returnLabel: formatDateLabel(dateTo),
      durationLabel,
    };
  }

  if (dateFrom) {
    return {
      departureLabel: formatDateLabel(dateFrom),
      returnLabel: 'Return date not provided',
      durationLabel,
    };
  }

  return {
    departureLabel: 'Dates not provided',
    returnLabel: 'Return date not provided',
    durationLabel,
  };
}

function formatFlexibleDuration({ flexibleDays, rangeDays }) {
  const days = Number(flexibleDays) || Number(rangeDays) || 0;
  if (days > 0) return `${days} days`;
  return 'Flexible days';
}

function formatDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date)) return value;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatYesNo(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '—';
}

function formatDayTrips(preferences) {
  if (!preferences) return '—';
  if (preferences.wantsDayTrips === true) {
    return preferences.dayTripsDetails?.trim() || 'Yes';
  }
  if (preferences.wantsDayTrips === false) return 'No';
  return '—';
}

function formatDuration(tripLengthDays, preferences) {
  if (tripLengthDays) {
    return `${tripLengthDays} day${tripLengthDays === 1 ? '' : 's'}`;
  }
  const { dateFrom, dateTo } = preferences || {};
  if (dateFrom && dateTo) {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    if (!Number.isNaN(start) && !Number.isNaN(end)) {
      const ms = end - start;
      if (ms > 0) {
        const days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
        return `${days} day${days === 1 ? '' : 's'}`;
      }
    }
  }
  return 'Duration to be confirmed';
}
