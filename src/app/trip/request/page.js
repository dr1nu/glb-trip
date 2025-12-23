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
import { getAirportsForCountry } from '@/lib/airports-by-country';
import AuthForm from '@/components/auth/AuthForm';

const STORAGE_KEY = 'glb-pending-trip';

function computeDaysBetween(startValue, endValue) {
  if (!startValue || !endValue) return null;
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 1 ? diff : 1;
}

function deriveAccommodationFromStyle(style) {
  const normalized = (style || '').toLowerCase();
  if (normalized.includes('shoe') || normalized.includes('budget')) return 'hostel';
  if (normalized.includes('comfort') || normalized.includes('luxury')) return 'luxury';
  return 'hotel';
}

function deriveBathroomPreference(style) {
  const normalized = (style || '').toLowerCase();
  if (normalized.includes('shoe') || normalized.includes('budget')) return 'no';
  return 'yes';
}

function normalizeAccommodationChoice(value, fallback = '') {
  const allowed = new Set(['hostel', 'hotel', 'luxury']);
  if (allowed.has(value)) return value;
  if (value === 'budget') return 'hostel';
  if (value === 'b&b' || value === 'flat' || value === 'airbnb') return 'hotel';
  if (value === 'none') return fallback || 'hotel';
  return fallback;
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

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
    flexibleDays: '',
    rangeDays: '',
    accommodation: '',
    accommodationBreakfast: 'either',
    accommodationBathroom: 'either',
    accommodationLocation: 'either',
    interests: [],
    details: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const airportsForHomeCountry = useMemo(
    () => getAirportsForCountry(form.homeCountry),
    [form.homeCountry]
  );
  const derivedRangeDays = useMemo(
    () => computeDaysBetween(form.dateFrom, form.dateTo),
    [form.dateFrom, form.dateTo]
  );
  const currentYear = new Date().getFullYear();
  const yearOptionStrings = useMemo(
    () => [currentYear, currentYear + 1, currentYear + 2].map(String),
    [currentYear]
  );
  const yearOptions = useMemo(() => yearOptionStrings.map(Number), [yearOptionStrings]);

  const getAvailableMonthsForYear = (year) => {
    const y = Number(year) || currentYear;
    const minMonth = y === currentYear ? new Date().getMonth() + 1 : 1;
    return MONTHS.filter((m) => Number(m.value) >= minMonth);
  };

  const flexibleMonthParts = useMemo(() => {
    if (!form.flexibleMonth || !form.flexibleMonth.includes('-')) {
      return { year: `${currentYear}`, month: '' };
    }
    const [y, m] = form.flexibleMonth.split('-');
    return { year: y, month: m };
  }, [form.flexibleMonth, currentYear]);

  const availableMonths = useMemo(
    () => getAvailableMonthsForYear(flexibleMonthParts.year),
    [flexibleMonthParts.year]
  );

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
    setForm((prev) => {
      const styleAccommodation = deriveAccommodationFromStyle(
        trip.travelStyle || trip.result?.styleLabel
      );
      const defaultBathroom = deriveBathroomPreference(
        trip.travelStyle || trip.result?.styleLabel
      );
      const derivedAccommodation = normalizeAccommodationChoice(
        prev.accommodation,
        styleAccommodation
      ) || styleAccommodation;
      return {
        ...prev,
        homeCountry: prev.homeCountry || trip.homeCountry || '',
        dateFrom: prev.dateFrom || trip.startDate || '',
        dateTo: prev.dateTo || trip.endDate || '',
        flexibleMonth: prev.flexibleMonth || trip.startDate?.slice(0, 7) || '',
        flexibleDays: prev.flexibleDays || trip.tripLengthDays || '',
        rangeDays: prev.rangeDays || trip.tripLengthDays || '',
        accommodation: derivedAccommodation,
        accommodationBathroom:
          prev.accommodationBathroom && prev.accommodationBathroom !== 'either'
            ? prev.accommodationBathroom
            : defaultBathroom,
      };
    });
  }, [trip]);

  useEffect(() => {
    if (!user) return;
    const profile = composeProfilePayload(user);
    const styleAccommodation = deriveAccommodationFromStyle(
      trip?.travelStyle || trip?.result?.styleLabel
    );
    const defaultBathroom = deriveBathroomPreference(
      trip?.travelStyle || trip?.result?.styleLabel
    );
    const profileBathroom = profile.travelPreferences.accommodationBathroom;
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
      flexibleDays:
        prev.flexibleDays ||
        profile.travelPreferences.flexibleDays ||
        trip?.tripLengthDays ||
        '',
      rangeDays:
        prev.rangeDays ||
        profile.travelPreferences.rangeDays ||
        trip?.tripLengthDays ||
        '',
      accommodation:
        normalizeAccommodationChoice(
          prev.accommodation || profile.travelPreferences.accommodation,
          styleAccommodation
        ) || styleAccommodation,
      accommodationBreakfast:
        prev.accommodationBreakfast || profile.travelPreferences.accommodationBreakfast || 'either',
      accommodationBathroom:
        profileBathroom && profileBathroom !== 'either'
          ? profileBathroom
          : prev.accommodationBathroom && prev.accommodationBathroom !== 'either'
            ? prev.accommodationBathroom
            : defaultBathroom,
      accommodationLocation:
        prev.accommodationLocation || profile.travelPreferences.accommodationLocation || 'either',
      interests:
        prev.interests?.length > 0
          ? prev.interests
          : [...(profile.travelPreferences.interests || [])],
      details: prev.details || profile.travelPreferences.details || '',
    }));
  }, [user, trip]);

  useEffect(() => {
    setForm((prev) => {
      if (!prev.homeCountry) {
        return prev.nearestAirport ? { ...prev, nearestAirport: '' } : prev;
      }
      if (prev.nearestAirport || airportsForHomeCountry.length === 0) {
        return prev;
      }
      return { ...prev, nearestAirport: airportsForHomeCountry[0] };
    });
  }, [airportsForHomeCountry]);

  useEffect(() => {
    if (form.travelWindow !== 'range') return;
    if (!derivedRangeDays) return;
    setForm((prev) => {
      if (prev.rangeDays) return prev;
      return { ...prev, rangeDays: derivedRangeDays };
    });
  }, [form.travelWindow, derivedRangeDays, form.rangeDays]);

  useEffect(() => {
    if (form.travelWindow !== 'flexible') return;
    const allowedYears = yearOptionStrings;
    const targetYear = allowedYears.includes(flexibleMonthParts.year)
      ? flexibleMonthParts.year
      : `${currentYear}`;
    const monthsForYear = getAvailableMonthsForYear(targetYear);
    const targetMonth =
      monthsForYear.find((m) => m.value === flexibleMonthParts.month)?.value ||
      monthsForYear[0]?.value ||
      '';
    const nextValue = targetMonth ? `${targetYear}-${targetMonth}` : '';
    if (nextValue && nextValue !== form.flexibleMonth) {
      setForm((prev) => ({ ...prev, flexibleMonth: nextValue }));
      return;
    }
    if (!form.flexibleDays) {
      setForm((prev) => ({
        ...prev,
        flexibleDays: prev.flexibleDays || trip?.tripLengthDays || '',
      }));
    }
  }, [
    form.travelWindow,
    form.flexibleMonth,
    form.flexibleDays,
    flexibleMonthParts.year,
    flexibleMonthParts.month,
    yearOptionStrings,
    currentYear,
    trip,
  ]);

  function updateFlexibleMonth(nextYear, nextMonth) {
    const months = getAvailableMonthsForYear(nextYear);
    const safeMonth =
      months.find((m) => m.value === nextMonth)?.value || months[0]?.value || '';
    const safeYear = nextYear || `${currentYear}`;
    setForm((prev) => ({
      ...prev,
      flexibleMonth: safeMonth ? `${safeYear}-${safeMonth}` : '',
    }));
  }

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
      const styleAccommodation = deriveAccommodationFromStyle(
        trip?.travelStyle || trip?.result?.styleLabel
      );
      const accommodationChoice =
        normalizeAccommodationChoice(form.accommodation, styleAccommodation) || styleAccommodation;
      const flexibleDays =
        form.travelWindow === 'flexible' && form.flexibleDays
          ? Number(form.flexibleDays)
          : form.travelWindow === 'flexible'
            ? Number(trip?.tripLengthDays || 0) || ''
            : '';
      const parsedRangeDays =
        form.travelWindow === 'range'
          ? Number(form.rangeDays || derivedRangeDays || trip?.tripLengthDays)
          : null;
      const rangeDays =
        form.travelWindow === 'range' && Number.isFinite(parsedRangeDays) && parsedRangeDays > 0
          ? Math.floor(parsedRangeDays)
          : form.travelWindow === 'range'
            ? derivedRangeDays || trip?.tripLengthDays || null
            : null;

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
        flexibleDays,
        rangeDays,
        accommodation: accommodationChoice,
        accommodationDetails: {
          breakfast: form.accommodationBreakfast,
          bathroom: form.accommodationBathroom,
          location: form.accommodationLocation,
        },
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
  const airportSelectValue = airportsForHomeCountry.includes(form.nearestAirport)
    ? form.nearestAirport
    : form.nearestAirport
      ? 'other'
      : '';
  const showCustomAirportInput =
    airportSelectValue === 'other' || airportsForHomeCountry.length === 0;
  const travelStyleLabel = result?.styleLabel || trip.travelStyle;
  const flexibleYearValue = yearOptionStrings.includes(flexibleMonthParts.year)
    ? flexibleMonthParts.year
    : `${currentYear}`;
  const flexibleMonthValue =
    availableMonths.find((m) => m.value === flexibleMonthParts.month)?.value ||
    availableMonths[0]?.value ||
    '';

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
                {airportsForHomeCountry.length > 0 ? (
                  <div className="flex flex-col gap-2 w-full">
                    <select
                      required
                      name="nearestAirportSelect"
                      value={airportSelectValue}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === 'other') {
                          setForm((prev) => ({ ...prev, nearestAirport: '' }));
                          return;
                        }
                        setForm((prev) => ({ ...prev, nearestAirport: value }));
                      }}
                      className="w-full bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                    >
                      <option value="" disabled>
                        Select an airport
                      </option>
                      {airportsForHomeCountry.map((airport) => (
                        <option key={airport} value={airport}>
                          {airport}
                        </option>
                      ))}
                      <option value="other">Other / not listed</option>
                    </select>
                    {showCustomAirportInput ? (
                      <input
                        required
                        type="text"
                        name="nearestAirport"
                        value={form.nearestAirport}
                        onChange={handleInputChange}
                        className="w-full bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                        placeholder="Type your closest airport"
                      />
                    ) : null}
                  </div>
                ) : (
                  <input
                    required
                    type="text"
                    name="nearestAirport"
                    value={form.nearestAirport}
                    onChange={handleInputChange}
                    className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                    placeholder="Start typing your nearest airport"
                  />
                )}
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
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-[#4B5563]">Preferred month</span>
                    <select
                      name="flexibleMonthSelect"
                      value={flexibleMonthValue}
                      onChange={(event) =>
                        updateFlexibleMonth(flexibleYearValue, event.target.value)
                      }
                      className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                    >
                      {availableMonths.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-[#4B5563]">Year</span>
                    <select
                      name="flexibleYearSelect"
                      value={flexibleYearValue}
                      onChange={(event) => updateFlexibleMonth(event.target.value, flexibleMonthValue)}
                      className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-[#4B5563]">Number of days</span>
                    <input
                      min={1}
                      type="number"
                      name="flexibleDays"
                      value={form.flexibleDays}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, flexibleDays: event.target.value }))
                      }
                      className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                      placeholder="e.g. 5"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
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
                  {form.travelWindow === 'range' ? (
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-[#0F172A] font-medium">Number of days within this range</span>
                      <input
                        min={1}
                        type="number"
                        name="rangeDays"
                        value={form.rangeDays}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, rangeDays: event.target.value }))
                        }
                        className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                        placeholder="e.g. 5"
                      />
                      <p className="text-xs text-[#4B5563]">
                        {derivedRangeDays
                          ? `From ${form.dateFrom || '—'} to ${form.dateTo || '—'} is about ${derivedRangeDays} day${derivedRangeDays === 1 ? '' : 's'}.`
                          : 'Tell us how long you want to be away inside this window.'}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-[#E3E6EF] bg-white p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[#0F172A]">Accommodation</span>
                <span className="text-xs text-[#6B7280]">Defaults to your travel style</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-[#4B5563]">Stay type</span>
                  <select
                    required
                    name="accommodation"
                    value={form.accommodation || ''}
                    onChange={handleInputChange}
                    className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                  >
                    <option value="" disabled>
                      Select an option
                    </option>
                    {ACCOMMODATION_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-[#6B7280]">
                    {travelStyleLabel
                      ? `Based on your ${travelStyleLabel} style we start with ${form.accommodation || 'a matching stay'}.`
                      : 'We use this to shortlist stays.'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="space-y-2">
                  <span className="font-medium text-[#0F172A]">Breakfast included?</span>
                  <div className="mt-1 flex flex-nowrap gap-3 overflow-x-auto">
                    {[
                      { value: 'yes', label: 'Yes' },
                      { value: 'either', label: 'Either' },
                      { value: 'no', label: 'No' },
                    ].map((opt) => {
                      const active = form.accommodationBreakfast === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, accommodationBreakfast: opt.value }))
                          }
                          className={`flex-1 rounded-xl border px-3 py-2 transition ${
                            active
                              ? 'border-[#FF6B35] bg-[#FFF4E8] text-[#C2461E] shadow-sm shadow-orange-100'
                              : 'border-orange-100 text-[#0F172A] bg-white hover:border-orange-200 hover:bg-orange-50/60'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="font-medium text-[#0F172A]">Private bathroom required?</span>
                  <div className="mt-1 flex flex-nowrap gap-3 overflow-x-auto">
                    {[
                      { value: 'yes', label: 'Yes' },
                      { value: 'no', label: 'Can be shared' },
                    ].map((opt) => {
                      const active = form.accommodationBathroom === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, accommodationBathroom: opt.value }))
                          }
                          className={`flex-1 rounded-xl border px-3 py-2 transition ${
                            active
                              ? 'border-[#FF6B35] bg-[#FFF4E8] text-[#C2461E] shadow-sm shadow-orange-100'
                              : 'border-orange-100 text-[#0F172A] bg-white hover:border-orange-200 hover:bg-orange-50/60'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Travel interests</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {TRAVEL_INTERESTS.map((interest) => (
                  <label
                    key={interest}
                    className={`flex min-h-[52px] items-center justify-between rounded-xl border px-3 py-2 cursor-pointer transition ${
                      form.interests.includes(interest)
                        ? 'border-[#FF6B35] bg-gradient-to-br from-white via-[#FFF4EC] to-white text-[#C2461E] shadow-sm shadow-orange-100'
                        : 'border-orange-100 text-[#0F172A] bg-white hover:border-orange-200 hover:bg-orange-50/50'
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
                    <span className="pr-2">{interest}</span>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold leading-none ${
                        form.interests.includes(interest)
                          ? 'bg-[#FF6B35] text-white'
                          : 'border border-orange-200 text-[#C2461E]'
                      }`}
                    >
                      {form.interests.includes(interest) ? '✓' : '+'}
                    </span>
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
                placeholder="Tell us about any other information not mentioned in the form... Must see experiences, travel style, what you want to do, location preferences, do you already have flights booked and just want an itinerary etc... The more detail the better the result!"
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
