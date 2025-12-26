'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const FLEXIBLE_MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: '2-digit',
  year: '2-digit',
});

const IMAGE_PLACEHOLDERS = [
  'from-sky-200 via-indigo-200 to-purple-200',
  'from-amber-200 via-rose-200 to-pink-200',
  'from-emerald-200 via-teal-200 to-sky-200',
  'from-blue-200 via-cyan-200 to-emerald-200',
];

const STATUS_ORDER = ['Requested', 'Itinerary Ready', 'Completed'];

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
  return formatTravelWindowLabel(trip);
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

function formatTravelWindowLabel(trip) {
  const preferences = trip?.preferences;
  if (!preferences) return 'Travel window pending';
  const { travelWindow, flexibleMonth, flexibleDays, rangeDays, dateFrom, dateTo } = preferences;
  if (travelWindow === 'flexible') {
    if (flexibleMonth) {
      const parsed = new Date(`${flexibleMonth}-01`);
      if (!Number.isNaN(parsed.getTime())) {
        const days =
          Number(flexibleDays) ||
          Number(rangeDays) ||
          Number(trip?.tripLengthDays) ||
          0;
        const daysLabel = days > 0 ? `${days} days` : 'Flexible days';
        return `${daysLabel} during ${FLEXIBLE_MONTH_FORMATTER.format(parsed)}`;
      }
    }
    return 'Flexible travel window';
  }
  if (travelWindow === 'range' && dateFrom && dateTo) {
    const fromLabel = formatNumericDate(dateFrom);
    const toLabel = formatNumericDate(dateTo);
    const days =
      Number(rangeDays) ||
      (() => {
        const start = new Date(dateFrom);
        const end = new Date(dateTo);
        if (Number.isNaN(start) || Number.isNaN(end)) return 0;
        const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
      })();
    const daysLabel = days > 0 ? `${days} days` : 'Flexible days';
    return `${daysLabel} between ${fromLabel} and ${toLabel}`;
  }
  if (travelWindow === 'specific') {
    return 'Specific dates pending';
  }
  return 'Dates pending';
}

function formatNumericDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date)) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
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
      label: 'Itinerary Ready',
      badge: 'bg-emerald-100 text-emerald-700',
    };
  }
  return {
    label: 'Requested',
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

function TripCard({ trip, index, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const gradient =
    IMAGE_PLACEHOLDERS[index % IMAGE_PLACEHOLDERS.length] ??
    IMAGE_PLACEHOLDERS[0];
  const status = getTripStatus(trip);
  const travelWindow = trip.preferences?.travelWindow;
  const dateRange = formatTripDates(trip);
  const duration = formatDuration(trip);
  const travelers = formatTravelers(trip);
  const showDuration = travelWindow === 'flexible';
  const imageUrl = trip.imageUrl ?? null;

  const handleDelete = async () => {
    if (isDeleting) return;
    const confirmed = window.confirm(
      'Delete this trip? This action cannot be undone.'
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload?.error || 'Unable to delete trip.';
        throw new Error(message);
      }
      onDelete(trip.id);
    } catch (err) {
      console.error('Failed to delete trip', err);
      window.alert(err instanceof Error ? err.message : 'Unable to delete trip.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <article className="relative flex flex-col gap-4 rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-lg shadow-orange-100/40 sm:flex-row sm:p-6">
      <div className="w-full overflow-hidden rounded-2xl sm:w-48">
        <div
          className="relative h-36 w-full overflow-hidden rounded-2xl bg-gradient-to-br"
          style={!imageUrl ? { backgroundImage: undefined } : undefined}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={trip.destinationCountry ? `Trip to ${trip.destinationCountry}` : 'Trip image'}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${gradient}`} />
          )}
          <div className="absolute inset-0 bg-black/15" />
          <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
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
              {trip.homeCountry ? `Departing from ${trip.homeCountry}` : 'Origin pending'}
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
          {showDuration && <TripInfoItem icon={<ClockIcon />} label={duration} />}
          <TripInfoItem icon={<UsersIcon />} label={travelers} />
        </div>
      </div>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label={isDeleting ? 'Deleting trip' : 'Delete trip'}
        className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 shadow shadow-rose-100 transition hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="sr-only">
          {isDeleting ? 'Deleting trip' : 'Delete trip'}
        </span>
        <TrashIcon />
      </button>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:self-center">
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

export default function MyTripsClient({ trips }) {
  const [tripList, setTripList] = useState(trips);
  const [statusFilter, setStatusFilter] = useState('all');
  const [destinationFilter, setDestinationFilter] = useState('all');

  const statusOptions = useMemo(() => {
    const present = new Set(tripList.map((trip) => getTripStatus(trip).label));
    return STATUS_ORDER.filter((status) => present.has(status));
  }, [tripList]);

  const destinationOptions = useMemo(() => {
    const unique = new Set(
      tripList
        .map((trip) => trip.destinationCountry)
        .filter((destination) => typeof destination === 'string' && destination.trim())
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [tripList]);

  const filteredTrips = useMemo(() => {
    return tripList.filter((trip) => {
      const statusMatch =
        statusFilter === 'all' || getTripStatus(trip).label === statusFilter;
      const destinationMatch =
        destinationFilter === 'all' || trip.destinationCountry === destinationFilter;
      return statusMatch && destinationMatch;
    });
  }, [tripList, statusFilter, destinationFilter]);

  const handleTripDelete = (tripId) => {
    setTripList((prev) => prev.filter((trip) => trip.id !== tripId));
  };

  return (
    <>
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
            className="rounded-2xl border border-orange-100 bg-white px-4 py-2 text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
          >
            New search
          </Link>
        </div>
      </header>

      {tripList.length > 0 ? (
        <section className="rounded-3xl border border-orange-100 bg-white/90 p-4 shadow-sm shadow-orange-50 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#4C5A6B]">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="all">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#4C5A6B]">
              Destination
              <select
                value={destinationFilter}
                onChange={(event) => setDestinationFilter(event.target.value)}
                className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="all">All destinations</option>
                {destinationOptions.map((destination) => (
                  <option key={destination} value={destination}>
                    {destination}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs uppercase tracking-wide text-[#4C5A6B]">
              {filteredTrips.length} trip{filteredTrips.length === 1 ? '' : 's'}
            </span>
          </div>
        </section>
      ) : null}

      {filteredTrips.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-orange-100 bg-white/90 p-10 text-center shadow-sm shadow-orange-50">
          <h2 className="text-xl font-semibold text-neutral-900">
            {tripList.length === 0 ? 'No trips yet' : 'No trips match your filters'}
          </h2>
          <p className="mt-2 text-sm text-[#4C5A6B]">
            {tripList.length === 0
              ? 'Plan your first adventure to see it appear here.'
              : 'Try clearing a filter to see more trips.'}
          </p>
          {tripList.length === 0 ? (
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow shadow-orange-200 hover:bg-orange-600"
            >
              Start a trip
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setDestinationFilter('all');
              }}
              className="mt-6 inline-flex items-center justify-center rounded-2xl border border-orange-100 bg-white px-5 py-2.5 text-sm font-semibold text-orange-600 shadow shadow-orange-100 hover:bg-orange-50"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredTrips.map((trip, index) => (
            <TripCard
              key={trip.id}
              trip={trip}
              index={index}
              onDelete={handleTripDelete}
            />
          ))}
        </div>
      )}
    </>
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
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 7h12" />
      <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
      <path d="M7 7l1 12a2 2 0 002 2h4a2 2 0 002-2l1-12" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
