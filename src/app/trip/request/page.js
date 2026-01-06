'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { composeProfilePayload } from '@/lib/profile';
import { HOME_COUNTRIES } from '@/lib/countries-europe';
import {
  ACCOMMODATION_OPTIONS,
  BAGGAGE_OPTIONS,
  TRAVEL_INTERESTS,
  TRAVEL_WINDOW_OPTIONS,
} from '@/lib/travel-preferences';
import { getAirportsForCountry } from '@/lib/airports-by-country';
import AuthForm from '@/components/auth/AuthForm';

const STORAGE_KEY = 'glb-pending-trip';

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

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
  if (normalized.includes('comfort') || normalized.includes('luxury')) return 'luxury-hotel';
  return 'hotel';
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

function formatDateInput(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(value) {
  const date = toDate(value);
  if (!date) return '—';
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${day}/${month}`;
}

function formatShortRange(startValue, endValue) {
  if (!startValue && !endValue) return 'Select dates';
  if (startValue && !endValue) return `${formatShortDate(startValue)} - --/--`;
  return `${formatShortDate(startValue)} - ${formatShortDate(endValue)}`;
}

function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay();

  const cells = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) {
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

  const start = toDate(startDate);
  const end = toDate(endDate);
  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef(null);
  const dragMovedRef = useRef(false);
  const [displayMonth, setDisplayMonth] = useState(() => {
    const seed = start || minDate;
    return new Date(seed.getFullYear(), seed.getMonth(), 1);
  });
  useEffect(() => {
    if (!start) return;
    setDisplayMonth(new Date(start.getFullYear(), start.getMonth(), 1));
  }, [startDate]);

  const isSelectingEnd = Boolean(start && !end);
  const rangeStart = isDragging ? dragStartRef.current : start;
  const rangeEnd = end || (isSelectingEnd ? hoverDate : isDragging ? hoverDate : null);
  const nextMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1);
  const monthLabel = displayMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const nextMonthLabel = nextMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  function handleDayClick(day) {
    if (!day) return;
    const normalized = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    if (normalized < minDate) return;

    if (start && !end && isSameDay(normalized, start)) {
      onStartDateChange('');
      onEndDateChange('');
      setHoverDate(null);
      return;
    }

    if (!start || (start && end)) {
      onStartDateChange(formatDateInput(normalized));
      onEndDateChange('');
      setHoverDate(null);
      return;
    }

    if (start && !end) {
      if (normalized < start) {
        onStartDateChange(formatDateInput(normalized));
        onEndDateChange('');
        setHoverDate(null);
        return;
      }
      onEndDateChange(formatDateInput(normalized));
      setHoverDate(null);
      setOpen(false);
    }
  }

  function startDrag(day) {
    if (!day) return;
    if (isDisabled(day)) return;
    const normalized = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    if (!start || end) {
      dragStartRef.current = normalized;
      setHoverDate(normalized);
      setIsDragging(true);
      dragMovedRef.current = false;
    }
  }

  function stopDrag(day) {
    if (!isDragging) return;
    setIsDragging(false);
    const startRef = dragStartRef.current;
    dragStartRef.current = null;
    const dragMoved = dragMovedRef.current;
    dragMovedRef.current = false;
    if (!day || !startRef) {
      setHoverDate(null);
      return;
    }
    if (!dragMoved) {
      handleDayClick(day);
      return;
    }
    const normalized = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    if (normalized < startRef) {
      onStartDateChange(formatDateInput(normalized));
      onEndDateChange(formatDateInput(startRef));
    } else {
      onStartDateChange(formatDateInput(startRef));
      onEndDateChange(formatDateInput(normalized));
    }
    setHoverDate(null);
    setOpen(false);
  }

  function inRange(day) {
    if (!rangeStart || !rangeEnd || !day) return false;
    const normalized = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return normalized >= rangeStart && normalized <= rangeEnd;
  }

  function isDisabled(day) {
    if (!day) return true;
    const normalized = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return normalized < minDate;
  }

  function renderMonthGrid(monthDate, label) {
    const cells = buildMonthGrid(monthDate);
    return (
      <div className="space-y-2">
        <div className="text-sm font-semibold text-neutral-900">{label}</div>
        <div className="grid grid-cols-7 gap-1 text-[11px] text-[#4C5A6B]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayLabel) => (
            <div key={`${label}-${dayLabel}`} className="text-center uppercase tracking-wide">
              {dayLabel}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            const activeStart = isDragging ? dragStartRef.current : start;
            const selectedStart = activeStart && isSameDay(day, activeStart);
            const selectedEnd = end && isSameDay(day, end);
            const highlighted = inRange(day);
            const disabled = isDisabled(day);
            return (
              <button
                key={`${label}-${day ? day.toISOString() : 'empty'}-${index}`}
                type="button"
                onMouseDown={() => startDrag(day)}
                onMouseUp={() => {
                  if (isDragging) {
                    stopDrag(day);
                    return;
                  }
                  handleDayClick(day);
                }}
                onMouseEnter={() => {
                  if (isSelectingEnd && day && !disabled) {
                    setHoverDate(new Date(day.getFullYear(), day.getMonth(), day.getDate()));
                  }
                  if (isDragging && day && !disabled) {
                    dragMovedRef.current = true;
                    setHoverDate(new Date(day.getFullYear(), day.getMonth(), day.getDate()));
                  }
                }}
                className={`h-9 rounded-lg text-sm transition ${
                  disabled
                    ? 'text-slate-300'
                    : selectedStart || selectedEnd
                    ? 'bg-orange-500 text-white'
                    : highlighted
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-slate-700 hover:bg-orange-50'
                }`}
                disabled={disabled}
              >
                {day ? day.getDate() : ''}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-2xl border border-[#E3E6EF] bg-white px-4 py-3 text-left text-sm font-medium text-[#0F172A] shadow-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
        aria-expanded={open}
      >
        <span className="flex items-center justify-between">
          <span>{formatShortRange(startDate, endDate)}</span>
          <span className="text-[#4C5A6B] text-xs">▾</span>
        </span>
      </button>

      {open ? (
        <div className="absolute left-1/2 z-30 mt-2 w-[min(95vw,760px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-orange-100">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm text-[#4C5A6B] hover:bg-orange-50"
              onClick={() =>
                setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
            >
              ←
            </button>
            <span className="text-xs font-semibold uppercase tracking-wide text-[#4C5A6B]">
              Select dates
            </span>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm text-[#4C5A6B] hover:bg-orange-50"
              onClick={() =>
                setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
            >
              →
            </button>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {renderMonthGrid(displayMonth, monthLabel)}
            {renderMonthGrid(nextMonth, nextMonthLabel)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#4C5A6B]">
            <span>{isSelectingEnd ? 'Select an end date' : 'Select a start date'}</span>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-orange-200 hover:text-[#C2461E] transition disabled:opacity-40"
              onClick={() => setOpen(false)}
              disabled={Boolean(start && !end)}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

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
    accommodation: [],
    accommodationBreakfast: 'either',
    accommodationLocation: 'either',
    hasBookedFlights: false,
    flightNumber: '',
    flightDate: '',
    hasBookedAccommodation: false,
    accommodationUrl: '',
    interests: [],
    details: '',
  });
  const [nearestAirportSelection, setNearestAirportSelection] = useState('');
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
      return {
        ...prev,
        homeCountry: prev.homeCountry || trip.homeCountry || '',
        dateFrom: prev.dateFrom || trip.startDate || '',
        dateTo: prev.dateTo || trip.endDate || '',
        flexibleMonth: prev.flexibleMonth || trip.startDate?.slice(0, 7) || '',
        flexibleDays: prev.flexibleDays || trip.tripLengthDays || '',
        rangeDays: prev.rangeDays || trip.tripLengthDays || '',
      };
    });
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
      accommodation: prev.accommodation,
      accommodationBreakfast:
        prev.accommodationBreakfast || profile.travelPreferences.accommodationBreakfast || 'either',
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
      if (
        nearestAirportSelection === 'other' ||
        prev.nearestAirport ||
        airportsForHomeCountry.length === 0
      ) {
        return prev;
      }
      return { ...prev, nearestAirport: airportsForHomeCountry[0] };
    });
  }, [airportsForHomeCountry, nearestAirportSelection]);

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
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : name === 'adults' || name === 'children'
            ? Number(value)
            : value,
    }));
  }

  function toggleAccommodationType(key) {
    setForm((prev) => {
      const current = Array.isArray(prev.accommodation) ? prev.accommodation : [];
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return { ...prev, accommodation: Array.from(next) };
    });
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
      const accommodationChoice = Array.isArray(form.accommodation) && form.accommodation.length > 0
        ? form.accommodation.join(', ')
        : '';
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
          location: form.accommodationLocation,
        },
        hasBookedFlights: form.hasBookedFlights,
        flightNumber: form.flightNumber.trim(),
        flightDate: form.flightDate,
        hasBookedAccommodation: form.hasBookedAccommodation,
        accommodationUrl: form.accommodationUrl.trim(),
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
  const derivedAirportSelectValue = airportsForHomeCountry.includes(form.nearestAirport)
    ? form.nearestAirport
    : form.nearestAirport
      ? 'other'
      : '';
  const airportSelectValue = nearestAirportSelection || derivedAirportSelectValue;
  const showCustomAirportInput =
    airportSelectValue === 'other' || airportsForHomeCountry.length === 0;
  const travelStyleLabel = result?.styleLabel || trip.travelStyle;
  const styleAccommodationKey = deriveAccommodationFromStyle(travelStyleLabel);
  const styleAccommodationLabel =
    ACCOMMODATION_OPTIONS.find((option) => option.key === styleAccommodationKey)?.label ||
    'a matching stay';
  const flexibleYearValue = yearOptionStrings.includes(flexibleMonthParts.year)
    ? flexibleMonthParts.year
    : `${currentYear}`;
  const flexibleMonthValue =
    availableMonths.find((m) => m.value === flexibleMonthParts.month)?.value ||
    availableMonths[0]?.value ||
    '';
  const selectedAccommodationTypes = Array.isArray(form.accommodation)
    ? form.accommodation
    : [];

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
            <div className="space-y-4 rounded-2xl border border-[#E3E6EF] bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-2xl font-semibold text-[#0F172A]">
                  Tell us about you
                </h2>
                <p className="text-sm text-[#4B5563] mt-1">
                  We use these details to lock in dates, find the best routes, and
                  get back to you with a tailored itinerary.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-[#0F172A]">First name</span>
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
                  <span className="font-medium text-[#0F172A]">Surname</span>
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
                <span className="font-medium text-[#0F172A]">Email</span>
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
                  <span className="font-medium text-[#0F172A]">Home country</span>
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
                    {HOME_COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-[#0F172A]">Nearest airport</span>
                  {airportsForHomeCountry.length > 0 ? (
                    <div className="flex flex-col gap-2 w-full">
                      <select
                        required
                        name="nearestAirportSelect"
                        value={airportSelectValue}
                        onChange={(event) => {
                          const value = event.target.value;
                          setNearestAirportSelection(value);
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
                  <span className="font-medium text-[#0F172A]">Adults</span>
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
                  <span className="font-medium text-[#0F172A]">Children</span>
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
            </div>

            <div className="border border-[#E3E6EF] rounded-2xl p-4 bg-white space-y-3 shadow-sm">
              <span className="block text-lg font-semibold text-[#0F172A]">
                Baggage preference
              </span>
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

            <div className="space-y-3 border border-[#E3E6EF] rounded-2xl p-4 bg-white shadow-sm">
              <span className="block text-lg font-semibold text-[#0F172A]">
                When do you want to travel?
              </span>
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
              <p className="text-xs text-[#6B7280]">
                {form.travelWindow === 'specific'
                  ? 'Specific: pick exact start and end dates.'
                  : form.travelWindow === 'flexible'
                  ? 'Flexible: pick a month and tell us how long you want to be away.'
                  : 'Range: pick a date window and the number of days you will travel.'}
              </p>
              {form.travelWindow === 'flexible' ? (
                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-sm w-full">
                    <span className="text-[#4B5563]">Preferred month</span>
                    <select
                      name="flexibleMonthSelect"
                      value={flexibleMonthValue}
                      onChange={(event) =>
                        updateFlexibleMonth(flexibleYearValue, event.target.value)
                      }
                      className="w-full bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                    >
                      {availableMonths.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm w-full">
                    <span className="text-[#4B5563]">Year</span>
                    <select
                      name="flexibleYearSelect"
                      value={flexibleYearValue}
                      onChange={(event) => updateFlexibleMonth(event.target.value, flexibleMonthValue)}
                      className="w-full bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm w-full">
                    <span className="text-[#4B5563]">Number of days</span>
                    <input
                      min={1}
                      type="number"
                      name="flexibleDays"
                      value={form.flexibleDays}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, flexibleDays: event.target.value }))
                      }
                      className="w-full bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                      placeholder="e.g. 5"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.travelWindow === 'specific' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-[#4B5563]">Dates</span>
                        <DateRangePicker
                          startDate={form.dateFrom}
                          endDate={form.dateTo}
                          onStartDateChange={(value) =>
                            setForm((prev) => ({ ...prev, dateFrom: value }))
                          }
                          onEndDateChange={(value) =>
                            setForm((prev) => ({ ...prev, dateTo: value }))
                          }
                        />
                      </label>
                      {form.travelWindow === 'range' ? (
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-[#0F172A] font-medium">
                            Number of days within this range
                          </span>
                          <input
                            min={1}
                            type="number"
                            name="rangeDays"
                            value={form.rangeDays}
                            onChange={(event) =>
                              setForm((prev) => ({ ...prev, rangeDays: event.target.value }))
                            }
                            className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-3 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                            placeholder="e.g. 5"
                          />
                        </label>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-[#E3E6EF] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="text-lg font-semibold text-[#0F172A]">
                  Accommodation preference
                </span>
              </div>
              <div className="space-y-2">
                <span className="text-xs text-[#6B7280]">Select one or more</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {ACCOMMODATION_OPTIONS.map((option) => {
                    const active = selectedAccommodationTypes.includes(option.key);
                    return (
                      <label
                        key={option.key}
                        className={`flex min-h-[52px] items-center justify-between rounded-xl border px-3 py-2 cursor-pointer transition ${
                          active
                            ? 'border-[#FF6B35] bg-gradient-to-br from-white via-[#FFF4EC] to-white text-[#C2461E] shadow-sm shadow-orange-100'
                            : 'border-orange-100 text-[#0F172A] bg-white hover:border-orange-200 hover:bg-orange-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={option.key}
                          checked={active}
                          onChange={() => toggleAccommodationType(option.key)}
                          className="hidden"
                        />
                        <span className="pr-2">{option.label}</span>
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold leading-none ${
                            active
                              ? 'bg-[#FF6B35] text-white'
                              : 'border border-orange-200 text-[#C2461E]'
                          }`}
                        >
                          {active ? '✓' : '+'}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <span className="text-xs text-[#6B7280]">
                  {travelStyleLabel
                    ? `Based on your ${travelStyleLabel} style we suggest ${styleAccommodationLabel}.`
                    : 'We use this to shortlist stays.'}
                </span>
              </div>

            </div>

            <div className="space-y-3 rounded-2xl border border-[#E3E6EF] bg-white p-4 shadow-sm">
              <span className="text-lg font-semibold text-[#0F172A]">Travel interests</span>
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

            <div className="space-y-3 rounded-2xl border border-[#E3E6EF] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="text-lg font-semibold text-[#0F172A]">
                  Existing bookings
                </span>
              </div>
              <p className="text-xs text-[#6B7280]">
                Sharing confirmed flights or accommodation helps us refine timing, transport, and
                costs for a more accurate itinerary.
              </p>
              <div className="space-y-3 text-sm">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="hasBookedFlights"
                    checked={form.hasBookedFlights}
                    onChange={handleInputChange}
                    className="h-4 w-4 accent-[#FF6B35]"
                  />
                  <span>I already have flights booked</span>
                </label>
                {form.hasBookedFlights ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-[#4B5563]">Flight number</span>
                      <input
                        type="text"
                        name="flightNumber"
                        value={form.flightNumber}
                        onChange={handleInputChange}
                        required={form.hasBookedFlights}
                        className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                        placeholder="e.g. BA248"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-[#4B5563]">Flight date</span>
                      <input
                        type="date"
                        name="flightDate"
                        value={form.flightDate}
                        onChange={handleInputChange}
                        required={form.hasBookedFlights}
                        className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                      />
                    </label>
                  </div>
                ) : null}

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="hasBookedAccommodation"
                    checked={form.hasBookedAccommodation}
                    onChange={handleInputChange}
                    className="h-4 w-4 accent-[#FF6B35]"
                  />
                  <span>I already have accommodation booked</span>
                </label>
                {form.hasBookedAccommodation ? (
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-[#4B5563]">Accommodation URL (optional)</span>
                    <input
                      type="url"
                      name="accommodationUrl"
                      value={form.accommodationUrl}
                      onChange={handleInputChange}
                      className="bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                      placeholder="https://"
                    />
                  </label>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-[#E3E6EF] bg-white p-4 shadow-sm">
              <span className="text-lg font-semibold text-[#0F172A]">
                Special requests / preferences
              </span>
              <textarea
                name="details"
                value={form.details}
                onChange={handleInputChange}
                rows={4}
                className="w-full bg-white border border-[#E3E6EF] rounded-xl px-3 py-2 text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A] resize-none"
                placeholder="Tell us about any other information not mentioned in the form... Must see experiences, travel style, what you want to do, location preferences, do you already have flights booked and just want an itinerary etc... The more detail the better the result!"
              />
            </div>

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
