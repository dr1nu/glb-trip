'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { composeProfilePayload } from '@/lib/profile';
import { EUROPE_COUNTRIES } from '@/lib/countries-europe';
import {
  ACCOMMODATION_OPTIONS,
  BAGGAGE_OPTIONS,
  TRAVEL_INTERESTS,
  TRAVEL_WINDOW_OPTIONS,
} from '@/lib/travel-preferences';
import AuthForm from '@/components/auth/AuthForm';

const STORAGE_KEY = 'glb-pending-trip';

export default function TripRequestPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [trip, setTrip] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    homeCountry: '',
    nearestAirport: '',
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
      homeCountry: prev.homeCountry || trip.homeCountry || '',
    }));
  }, [trip]);

  useEffect(() => {
    if (!user) return;
    const profile = composeProfilePayload(user);
    setForm((prev) => ({
      ...prev,
      firstName: profile.firstName || profile.fullName || prev.firstName || '',
      lastName: profile.lastName || prev.lastName || '',
      email: profile.email || prev.email || '',
      homeCountry: profile.homeCountry || prev.homeCountry || trip?.homeCountry || '',
      nearestAirport: profile.nearestAirport || prev.nearestAirport || '',
      baggage: prev.baggage || profile.travelPreferences.baggage,
      travelWindow: prev.travelWindow || profile.travelPreferences.travelWindow,
      dateFrom: prev.dateFrom || profile.travelPreferences.dateFrom,
      dateTo: prev.dateTo || profile.travelPreferences.dateTo,
      flexibleMonth: prev.flexibleMonth || profile.travelPreferences.flexibleMonth,
      accommodation: prev.accommodation || profile.travelPreferences.accommodation,
      interests:
        prev.interests?.length > 0
          ? prev.interests
          : [...(profile.travelPreferences.interests || [])],
      details: prev.details || profile.travelPreferences.details || '',
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
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        name: [form.firstName, form.lastName].filter(Boolean).join(' ').trim(),
        email: form.email.trim(),
        homeCountry: form.homeCountry,
        nearestAirport: form.nearestAirport.trim(),
        adults: form.adults,
        children: form.children,
        details: form.details.trim(),
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
      <main className="min-h-screen bg-gradient-to-b from-[#eaf3ff] via-white to-[#fffaf5] text-[#0F172A] p-4 flex items-center justify-center">
        <div className="text-sm text-[#4B5563]">Loading your trip…</div>
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
    <main className="min-h-screen bg-gradient-to-b from-[#eaf3ff] via-white to-[#fffaf5] text-[#0F172A] p-4 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">
        <section className="bg-white border border-[#E3E6EF] rounded-3xl p-6 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.35)]">
          {!authReady ? (
            <div className="text-sm text-[#4B5563]">Checking your account…</div>
          ) : user ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <h2 className="text-xl font-semibold">Tell us about you</h2>
              <p className="text-sm text-[#4B5563] mt-1">
                We use these details to lock in dates, find the best routes, and
                get back to you with a tailored itinerary.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">First name</span>
                <input
                  required
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleInputChange}
                  className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                  placeholder="Jane"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">Surname</span>
                <input
                  required
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleInputChange}
                  className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                  placeholder="Doe"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Email</span>
              <input
                required
                type="email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
                  className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                placeholder="jane@example.com"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">Home country</span>
                <select
                  required
                  name="homeCountry"
                  value={form.homeCountry}
                  onChange={handleInputChange}
                  className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                >
                  <option value="" disabled>
                    Select your country
                  </option>
                  {EUROPE_COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">Nearest airport</span>
                <input
                  required
                  type="text"
                  name="nearestAirport"
                  value={form.nearestAirport}
                  onChange={handleInputChange}
                  className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                  placeholder="e.g. Lisbon"
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
                  className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
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
                  className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                />
              </label>
            </div>

            <div className="border border-[#E3E6EF] rounded-xl p-4 bg-white space-y-3">
              <span className="block text-sm font-medium">Baggage preference</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {BAGGAGE_OPTIONS.map((option) => (
                  <label
                    key={option.key}
                    className={`rounded-xl border px-3 py-2 text-center cursor-pointer transition ${
                      form.baggage === option.key
                        ? 'border-[#FF6B35] bg-[#FFF4E8] text-[#C2461E] shadow-sm shadow-orange-100'
                        : 'border-[#E5E7EF] text-[#0F172A] bg-white hover:border-[#D8DFEC]'
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

            <div className="space-y-3 border border-[#E3E6EF] rounded-xl p-4 bg-white">
              <span className="block text-sm font-medium">When do you want to travel?</span>
              <div className="flex flex-wrap gap-3 text-sm">
                {TRAVEL_WINDOW_OPTIONS.map((option) => (
                  <label
                    key={option.key}
                    className={`rounded-xl border px-3 py-2 cursor-pointer transition ${
                      form.travelWindow === option.key
                        ? 'border-[#FF6B35] bg-[#FFF4E8] text-[#C2461E] shadow-sm shadow-orange-100'
                        : 'border-[#E5E7EF] text-[#0F172A] bg-white hover:border-[#D8DFEC]'
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
                  <span className="text-sm text-[#4B5563]">Preferred month</span>
                  <input
                    type="month"
                    name="flexibleMonth"
                    value={form.flexibleMonth}
                    onChange={handleInputChange}
                    className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-[#4B5563]">From</span>
                    <input
                      type="date"
                      name="dateFrom"
                      value={form.dateFrom}
                      onChange={handleInputChange}
                      className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                      required={form.travelWindow !== 'flexible'}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-[#4B5563]">To</span>
                    <input
                      type="date"
                      name="dateTo"
                      value={form.dateTo}
                      onChange={handleInputChange}
                      className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                      required={form.travelWindow !== 'flexible'}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="border border-[#E3E6EF] rounded-xl p-4 bg-white space-y-2">
              <span className="text-sm font-medium">Accommodation preference</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {ACCOMMODATION_OPTIONS.map((option) => (
                  <label
                    key={option.key}
                    className={`rounded-xl border px-3 py-2 cursor-pointer transition ${
                      form.accommodation === option.key
                        ? 'border-[#FF6B35] bg-[#FFF4E8] text-[#C2461E] shadow-sm shadow-orange-100'
                        : 'border-[#E5E7EF] text-[#0F172A] bg-white hover:border-[#D8DFEC]'
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
                {TRAVEL_INTERESTS.map((interest) => (
                  <label
                    key={interest}
                    className={`rounded-xl border px-3 py-2 cursor-pointer transition ${
                      form.interests.includes(interest)
                        ? 'border-[#FF6B35] bg-[#FFF4E8] text-[#C2461E] shadow-sm shadow-orange-100'
                        : 'border-[#E5E7EF] text-[#0F172A] bg-white hover:border-[#D8DFEC]'
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
                className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A] resize-none"
                placeholder="Dietary needs, accessibility, must-see experiences..."
              />
            </label>

            <div className="rounded-xl border border-[#E3E6EF] bg-[#F4F6FB] text-sm text-[#0F172A] p-3 flex gap-3">
              <span className="mt-0.5 text-[#FF6B35]">•</span>
              <span>
                After submitting, our travel experts will review your request and send a personalised
                itinerary within 24–48 hours.
              </span>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 border border-red-500/30 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full font-semibold text-sm py-3 rounded-xl transition ${
                isSubmitting
                  ? 'bg-slate-100 text-[#4B5563] cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#FF8A3C] via-[#FF6B35] to-[#FF5B24] text-white shadow-md shadow-orange-200 hover:from-[#FF9B55] hover:via-[#FF6B35] hover:to-[#FF4A12]'
              }`}
            >
              {isSubmitting ? 'Submitting…' : 'Request My Holiday!'}
            </button>
          </form>
          ) : (
            <AuthForm
              supabase={supabase}
              defaultFirstName={form.firstName}
              defaultLastName={form.lastName}
              defaultEmail={form.email}
              defaultHomeCountry={form.homeCountry || trip?.homeCountry || ''}
              defaultNearestAirport={form.nearestAirport}
              layout="inline"
              onSuccess={(profile) => {
                setForm((prev) => ({
                  ...prev,
                  firstName: profile.firstName ?? prev.firstName ?? '',
                  lastName: profile.lastName ?? prev.lastName ?? '',
                  email: profile.email ?? prev.email ?? '',
                  homeCountry:
                    profile.homeCountry ?? prev.homeCountry ?? trip?.homeCountry ?? '',
                  nearestAirport: profile.nearestAirport ?? prev.nearestAirport ?? '',
                }));
                setError('');
              }}
            />
          )}
        </section>

        <section className="text-center text-sm text-[#4B5563]">
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
