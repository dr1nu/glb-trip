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
    adults: 2,
    children: 0,
    baggage: 'cabin',
    travelWindow: 'specific',
    dateFrom: '',
    dateTo: '',
    flexibleMonth: '',
    accommodation: 'hotel',
    interests: [],
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
      const contact = {
        name: form.name.trim(),
        email: form.email.trim(),
        city: form.city.trim(),
        adults: form.adults,
        children: form.children,
      };
      const preferences = {
        baggage: form.baggage,
        travelWindow: form.travelWindow,
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
        flexibleMonth: form.flexibleMonth,
        accommodation: form.accommodation,
        interests: form.interests,
        details: form.details.trim(),
      };

      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...trip,
          contact,
          preferences,
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

  if (!trip) {
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
  } = trip;

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">Adults</span>
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
                <span className="font-medium">Children</span>
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

            <div className="border border-neutral-700 rounded-xl p-4 space-y-3">
              <span className="block text-sm font-medium">Baggage preference</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {[
                  { key: 'small', label: 'Small bag only' },
                  { key: 'cabin', label: 'Cabin bag' },
                  { key: 'checked', label: 'Checked bag' },
                ].map((option) => (
                  <label
                    key={option.key}
                    className={`rounded-xl border px-3 py-2 text-center cursor-pointer ${
                      form.baggage === option.key
                        ? 'border-orange-500 text-orange-300'
                        : 'border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="baggage"
                      value={option.key}
                      checked={form.baggage === option.key}
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3 border border-neutral-700 rounded-xl p-4">
              <span className="block text-sm font-medium">When do you want to travel?</span>
              <div className="flex flex-wrap gap-3 text-sm">
                {[
                  { key: 'specific', label: 'Specific dates' },
                  { key: 'flexible', label: 'Flexible' },
                  { key: 'range', label: 'Range' },
                ].map((option) => (
                  <label
                    key={option.key}
                    className={`rounded-xl border px-3 py-2 cursor-pointer ${
                      form.travelWindow === option.key
                        ? 'border-orange-500 text-orange-300'
                        : 'border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="travelWindow"
                      value={option.key}
                      checked={form.travelWindow === option.key}
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {form.travelWindow === 'flexible' ? (
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Preferred month</span>
                  <input
                    type="month"
                    name="flexibleMonth"
                    value={form.flexibleMonth}
                    onChange={handleInputChange}
                    className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-neutral-400">From</span>
                    <input
                      type="date"
                      name="dateFrom"
                      value={form.dateFrom}
                      onChange={handleInputChange}
                      className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required={form.travelWindow !== 'flexible'}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-neutral-400">To</span>
                    <input
                      type="date"
                      name="dateTo"
                      value={form.dateTo}
                      onChange={handleInputChange}
                      className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required={form.travelWindow !== 'flexible'}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="border border-neutral-700 rounded-xl p-4 space-y-2">
              <span className="text-sm font-medium">Accommodation preference</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {[
                  { key: 'budget', label: 'Budget hotel' },
                  { key: 'b&b', label: 'Bed & breakfast' },
                  { key: 'luxury', label: 'Luxury hotel' },
                  { key: 'flat', label: 'Flat' },
                  { key: 'airbnb', label: 'Airbnb' },
                  { key: 'none', label: 'No preference' },
                ].map((option) => (
                  <label
                    key={option.key}
                    className={`rounded-xl border px-3 py-2 cursor-pointer ${
                      form.accommodation === option.key
                        ? 'border-orange-500 text-orange-300'
                        : 'border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accommodation"
                      value={option.key}
                      checked={form.accommodation === option.key}
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Travel interests</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {[
                  'Culture & History',
                  'Adventure & Sports',
                  'Food & Dining',
                  'Nature & Wildlife',
                  'Beach & Relaxation',
                  'Shopping',
                  'Nightlife',
                  'Photography',
                ].map((interest) => (
                  <label
                    key={interest}
                    className={`rounded-xl border px-3 py-2 cursor-pointer ${
                      form.interests.includes(interest)
                        ? 'border-orange-500 text-orange-300'
                        : 'border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={interest}
                      checked={form.interests.includes(interest)}
                      onChange={(event) => {
                        const { checked, value } = event.target;
                        setForm((prev) => ({
                          ...prev,
                          interests: checked
                            ? [...prev.interests, value]
                            : prev.interests.filter((item) => item !== value),
                        }));
                      }}
                      className="hidden"
                    />
                    {interest}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Special requests / preferences</span>
              <textarea
                name="details"
                value={form.details}
                onChange={handleInputChange}
                rows={4}
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                placeholder="Dietary needs, accessibility, must-see experiences..."
              />
            </label>

            <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/5 text-sm text-yellow-200 p-3">
              After submitting, our travel experts will review your request and send a personalised
              itinerary within 24–48 hours.
            </div>

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

function euro(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `€${Math.round(value)}`;
}

// authentication handled via shared AuthForm component
