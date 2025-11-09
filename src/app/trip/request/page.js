'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import AuthForm from '@/components/auth/AuthForm';

const STORAGE_KEY = 'glb-pending-trip';

export default function TripRequestPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [trip, setTrip] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    city: '',
    adults: 1,
    children: 0,
    details: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        router.replace('/');
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        router.replace('/');
        return;
      }
      setTrip(parsed);
    } catch (err) {
      console.error('Failed to load pending trip from storage', err);
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        setAuthReady(true);
      }
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const summary = useMemo(() => {
    if (!trip) return null;
    return {
      destinationCountry: trip.destinationCountry ?? '—',
      homeCountry: trip.homeCountry ?? '—',
      tripLengthDays: trip.tripLengthDays ?? '—',
      budgetTotal: trip.budgetTotal ?? '—',
      result: trip.result ?? {},
    };
  }, [trip]);

  useEffect(() => {
    if (!trip) return;
    setForm((prev) => ({
      ...prev,
      city: prev.city || trip.homeCountry || '',
    }));
  }, [trip]);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || user.user_metadata?.name || '',
      email: prev.email || user.email || '',
      city: prev.city || trip?.homeCountry || '',
    }));
  }, [user, trip]);

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'adults' || name === 'children' ? Number(value) : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!trip || isSubmitting) return;
    if (!user) {
      setError('Please create an account before requesting your trip.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...trip,
          contact: {
            name: form.name.trim(),
            email: form.email.trim(),
            city: form.city.trim(),
            adults: form.adults,
            children: form.children,
            details: form.details.trim(),
          },
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof data?.error === 'string'
            ? data.error
            : `Failed with status ${response.status}.`;
        throw new Error(message);
      }

      sessionStorage.removeItem(STORAGE_KEY);
      const tripId = data?.tripId;
      if (tripId) {
        router.replace(`/trip/${tripId}`);
      } else {
        router.replace('/');
      }
    } catch (err) {
      console.error('Failed to submit trip request', err);
      setError(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!summary) {
    return (
      <main className="min-h-screen bg-neutral-900 text-neutral-100 p-4 flex items-center justify-center">
        <div className="text-sm text-neutral-400">Loading your trip…</div>
      </main>
    );
  }

  const {
    destinationCountry,
    homeCountry,
    tripLengthDays,
    budgetTotal,
    result = {},
  } = summary;

  const {
    perDay,
    accom,
    other,
    bucket,
    styleLabel,
    flight = {},
    totalLow,
    totalHigh,
    fits,
    suggestion,
  } = result;

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-100 p-4 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">
        <section className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">
                Trip to {destinationCountry}
              </h1>
              <p className="text-sm text-neutral-400">
                Ready to personalise and request your holiday.
              </p>
            </div>
            <span className="text-xs uppercase tracking-wide text-neutral-400 border border-neutral-700 rounded-lg px-3 py-1">
              Estimated total {euro(totalLow)} – {euro(totalHigh)}
            </span>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Fact label="Destination" value={destinationCountry} />
            <Fact label="Home" value={homeCountry} />
            <Fact
              label="Trip length"
              value={`${tripLengthDays} day${
                tripLengthDays === 1 ? '' : 's'
              }`}
            />
            <Fact label="Travel style" value={styleLabel ?? 'Not captured'} />
            <Fact label="Budget" value={euro(budgetTotal)} />
            <Fact
              label="Daily spend"
              value={perDay ? `${euro(perDay)} / day` : 'Not captured'}
            />
          </div>

          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="text-neutral-400">Estimated total</span>
              <span className="font-semibold">
                {euro(totalLow)} – {euro(totalHigh)}
              </span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-neutral-400">
              <span>Accommodation ({bucket ?? '—'})</span>
              <span>{accom ? euro(accom) : '—'}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-neutral-400">
              <span>Other daily costs</span>
              <span>{other ? euro(other) : '—'}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-neutral-400">
              <span>Flights</span>
              <span>
                {flight.low ? euro(flight.low) : '—'} –{' '}
                {flight.high ? euro(flight.high) : '—'}
              </span>
            </div>
            <div
              className={`font-semibold ${
                fits ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {fits
                ? 'This itinerary fits the budget.'
                : suggestion || 'Budget data unavailable.'}
            </div>
          </div>
        </section>

        <section className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6">
          {!authReady ? (
            <div className="text-sm text-neutral-400">Checking your account…</div>
          ) : user ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <h2 className="text-xl font-semibold">Tell us about you</h2>
              <p className="text-sm text-neutral-400 mt-1">
                We use these details to lock in dates, find the best routes, and
                get back to you with a tailored itinerary.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">Name</span>
                <input
                  required
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Jane Doe"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">Email</span>
                <input
                  required
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleInputChange}
                  className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="jane@example.com"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm sm:col-span-2">
                <span className="font-medium">City</span>
                <input
                  required
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleInputChange}
                  className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Where you live"
                />
              </label>
            </div>

            <div>
              <span className="block text-sm font-medium mb-2">
                Who is travelling?
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-neutral-300">Adults</span>
                  <input
                    min={1}
                    type="number"
                    name="adults"
                    value={form.adults}
                    onChange={handleInputChange}
                    className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-neutral-300">Children</span>
                  <input
                    min={0}
                    type="number"
                    name="children"
                    value={form.children}
                    onChange={handleInputChange}
                    className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </label>
              </div>
            </div>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Additional details / requests</span>
              <textarea
                name="details"
                value={form.details}
                onChange={handleInputChange}
                rows={4}
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                placeholder="Let us know about dates, budget tweaks, must-see spots…"
              />
            </label>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full font-semibold text-sm py-3 rounded-xl transition-colors ${
                isSubmitting
                  ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-neutral-900'
              }`}
            >
              {isSubmitting ? 'Submitting…' : 'Request My Holiday!'}
            </button>
          </form>
          ) : (
            <AuthForm
              supabase={supabase}
              defaultName={form.name}
              defaultEmail={form.email}
              defaultCountry={trip?.homeCountry ?? ''}
              layout="inline"
              onSuccess={(profile) => {
                setForm((prev) => ({
                  ...prev,
                  name: profile.name ?? prev.name,
                  email: profile.email ?? prev.email,
                  city: prev.city || trip?.homeCountry || '',
                }));
                setError('');
              }}
            />
          )}
        </section>

        <section className="text-center text-sm text-neutral-500">
          <p>
            Already booked some trips?{' '}
            <Link className="text-orange-400 hover:text-orange-300" href="/my-trips">
              View My Trips
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

function Fact({ label, value }) {
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="text-sm font-medium">{value ?? '—'}</div>
    </div>
  );
}

function euro(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `€${Math.round(value)}`;
}

// authentication handled via shared AuthForm component
