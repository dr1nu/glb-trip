import Link from 'next/link';
import { listTripsByOwner } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import SignOutButton from './_components/SignOutButton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

const IMAGE_PLACEHOLDERS = [
  'from-sky-200 via-indigo-200 to-purple-200',
  'from-amber-200 via-rose-200 to-pink-200',
  'from-emerald-200 via-teal-200 to-sky-200',
  'from-blue-200 via-cyan-200 to-emerald-200',
];

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTripDates(trip) {
  const start = parseDate(trip.preferences?.dateFrom);
  const end = parseDate(trip.preferences?.dateTo);
  if (start && end) {
    if (start.getTime() === end.getTime()) {
      return DATE_FORMATTER.format(start);
    }
    return `${DATE_FORMATTER.format(start)} to ${DATE_FORMATTER.format(end)}`;
  }
  if (start) return DATE_FORMATTER.format(start);
  if (end) return DATE_FORMATTER.format(end);
  return formatTravelWindowLabel(trip.preferences);
}

function formatDuration(trip) {
  if (trip.tripLengthDays) {
    return `${trip.tripLengthDays} day${trip.tripLengthDays === 1 ? '' : 's'}`;
  }
  const start = parseDate(trip.preferences?.dateFrom);
  const end = parseDate(trip.preferences?.dateTo);
  if (start && end) {
    const diffDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
    return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
  }
  return 'Length pending';
}

function formatTravelWindowLabel(preferences) {
  if (!preferences) return 'Travel window pending';
  const { travelWindow, flexibleMonth } = preferences;
  if (travelWindow === 'flexible') {
    if (flexibleMonth) {
      const parsed = new Date(`${flexibleMonth}-01`);
      if (!Number.isNaN(parsed.getTime())) {
        return `Flexible: ${MONTH_FORMATTER.format(parsed)}`;
      }
    }
    return 'Flexible travel window';
  }
  if (travelWindow === 'range') {
    return 'Preferred date range';
  }
  if (travelWindow === 'specific') {
    return 'Specific dates pending';
  }
  return 'Dates pending';
}

function formatTravelers(trip) {
  const adults = trip.contact?.adults ?? 0;
  const children = trip.contact?.children ?? 0;
  const total = adults + children;
  if (total > 0) {
    return `${total} traveler${total === 1 ? '' : 's'}`;
  }
  return 'Travelers pending';
}

function getTripStatus(trip) {
  const endDate = parseDate(trip.preferences?.dateTo);
  const now = new Date();
  if (endDate && endDate < now) {
    return {
      label: 'Completed',
      badge: 'bg-blue-100 text-blue-700',
    };
  }
  if (trip.published) {
    return {
      label: 'Confirmed',
      badge: 'bg-emerald-100 text-emerald-700',
    };
  }
  return {
    label: 'Pending',
    badge: 'bg-amber-100 text-amber-700',
  };
}

function TripInfoItem({ icon, label }) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-600">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function TripCard({ trip, index }) {
  const gradient =
    IMAGE_PLACEHOLDERS[index % IMAGE_PLACEHOLDERS.length] ??
    IMAGE_PLACEHOLDERS[0];
  const status = getTripStatus(trip);
  const dateRange = formatTripDates(trip);
  const duration = formatDuration(trip);
  const travelers = formatTravelers(trip);

  return (
    <article className="flex flex-col gap-4 rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-lg shadow-orange-100/40 sm:flex-row sm:p-6">
      <div className="w-full overflow-hidden rounded-2xl sm:w-48">
        <div
          className={`relative h-36 w-full bg-gradient-to-br ${gradient}`}
        >
          <div className="absolute inset-0 bg-black/15" />
          <div className="relative flex h-full w-full flex-col justify-end p-4 text-white">
            <p className="text-xs uppercase tracking-wide opacity-80">Explore</p>
            <p className="text-lg font-semibold truncate">
              {trip.destinationCountry || 'Destination TBD'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">
              {trip.destinationCountry || 'Destination TBD'}
            </h2>
            <p className="text-sm text-[#4C5A6B]">
              {trip.homeCountry
                ? `Departing from ${trip.homeCountry}`
                : 'Origin pending'}
            </p>
          </div>
          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${status.badge}`}
          >
            {status.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-5 text-sm text-neutral-600">
          <TripInfoItem icon={<CalendarIcon />} label={dateRange} />
          <TripInfoItem icon={<ClockIcon />} label={duration} />
          <TripInfoItem icon={<UsersIcon />} label={travelers} />
        </div>
      </div>

      <div className="w-full sm:w-auto sm:self-center">
        <Link
          href={`/trip/${trip.id}`}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow shadow-orange-200 transition hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}

export default async function MyTripsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#f7faff] via-white to-[#fff7ef] px-4 py-14 text-neutral-900">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center">
          <div className="w-full rounded-[28px] border border-neutral-200 bg-white px-6 py-12 text-center shadow-xl shadow-orange-100/60 sm:px-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V8.25a4.5 4.5 0 1 0-9 0v2.25m-.75 0h10.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5Z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-neutral-900">Sign in to view your trips</h1>
            <p className="mt-3 text-sm text-neutral-600">
              Create an account or sign in to access your personalized travel itineraries and
              bookings.
            </p>
            <Link
              href="/account"
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow shadow-orange-200 transition hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const trips = await listTripsByOwner(user.id);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#E9F2FF] via-white to-[#FFF6ED] text-neutral-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-28 pt-10 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">My Trips</h1>
            <p className="text-sm text-neutral-600">
              View and manage your travel itineraries
            </p>
          </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="text-sm font-semibold text-neutral-700 hover:text-neutral-900"
              >
                New search
              </Link>
              <SignOutButton />
            </div>
        </header>

        {trips.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-orange-100 bg-white/90 p-10 text-center shadow-sm shadow-orange-50">
            <h2 className="text-xl font-semibold text-neutral-900">
              No trips yet
            </h2>
            <p className="mt-2 text-sm text-[#4C5A6B]">
              Plan your first adventure to see it appear here.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow shadow-orange-200 hover:bg-orange-600"
            >
              Start a trip
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {trips.map((trip, index) => (
              <TripCard key={trip.id} trip={trip} index={index} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="h-5 w-5 text-[#4C5A6B]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="h-5 w-5 text-[#4C5A6B]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="h-5 w-5 text-[#4C5A6B]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
