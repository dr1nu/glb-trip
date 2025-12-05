'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EUROPE_COUNTRIES } from '@/lib/countries-europe';
import { getDailyBreakdown, STYLE_PRESETS } from '@/lib/pricing';
import { COUNTRY_HUBS, estimateReturnFare } from '@/lib/airfare';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { composeProfilePayload } from '@/lib/profile';
import AuthForm from '@/components/auth/AuthForm';

const SUMMER_HEAVY_DESTINATIONS = new Set([
  'Spain', 'Portugal', 'France', 'Italy', 'Croatia', 'Greece', 'Malta', 'Cyprus', 'Türkiye',
  'Albania', 'Montenegro', 'Georgia'
]);

const WINTER_HEAVY_DESTINATIONS = new Set([
  'Switzerland', 'Austria', 'Norway', 'Sweden', 'Finland', 'Iceland', 'Andorra'
]);

const PEAK_SUMMER_MONTHS = [5, 6, 7]; // Jun-Aug
const SHOULDER_SUMMER_MONTHS = [3, 4, 8, 9]; // Apr-May, Sep-Oct
const PEAK_WINTER_MONTHS = [11, 0, 1]; // Dec-Feb
const SHOULDER_WINTER_MONTHS = [2, 10]; // Mar, Nov

const DESTINATION_CITIES = {
  Italy: [
    { city: 'Rome', hub: { iata: 'FCO', lat: 41.8003, lon: 12.2389, factor: 0.95 } },
    { city: 'Milan', hub: { iata: 'MXP', lat: 45.6306, lon: 8.7281, factor: 0.95 } },
    { city: 'Venice', hub: { iata: 'VCE', lat: 45.5053, lon: 12.3519, factor: 1.0 } },
    { city: 'Florence', hub: { iata: 'FLR', lat: 43.8100, lon: 11.2051, factor: 1.0 } },
    { city: 'Naples', hub: { iata: 'NAP', lat: 40.8860, lon: 14.2908, factor: 1.0 } },
  ],
  Spain: [
    { city: 'Barcelona', hub: { iata: 'BCN', lat: 41.2974, lon: 2.0833, factor: 0.95 } },
    { city: 'Madrid', hub: { iata: 'MAD', lat: 40.4722, lon: -3.5608, factor: 0.9 } },
    { city: 'Seville', hub: { iata: 'SVQ', lat: 37.4170, lon: -5.8931, factor: 0.95 } },
    { city: 'Valencia', hub: { iata: 'VLC', lat: 39.4893, lon: -0.4816, factor: 0.95 } },
    { city: 'Malaga', hub: { iata: 'AGP', lat: 36.6749, lon: -4.4991, factor: 0.95 } },
  ],
  France: [
    { city: 'Paris', hub: { iata: 'ORY', lat: 48.7233, lon: 2.3794, factor: 0.95 } },
    { city: 'Nice', hub: { iata: 'NCE', lat: 43.6653, lon: 7.2150, factor: 1.05 } },
    { city: 'Lyon', hub: { iata: 'LYS', lat: 45.7264, lon: 5.0908, factor: 0.95 } },
    { city: 'Marseille', hub: { iata: 'MRS', lat: 43.4367, lon: 5.2150, factor: 0.95 } },
    { city: 'Bordeaux', hub: { iata: 'BOD', lat: 44.8283, lon: -0.7156, factor: 0.95 } },
  ],
  Portugal: [
    { city: 'Lisbon', hub: { iata: 'LIS', lat: 38.7742, lon: -9.1342, factor: 0.95 } },
    { city: 'Porto', hub: { iata: 'OPO', lat: 41.2421, lon: -8.6781, factor: 0.95 } },
    { city: 'Faro', hub: { iata: 'FAO', lat: 37.0144, lon: -7.9659, factor: 0.95 } },
  ],
  Greece: [
    { city: 'Athens', hub: { iata: 'ATH', lat: 37.9364, lon: 23.9465, factor: 1.0 } },
    { city: 'Santorini', hub: { iata: 'JTR', lat: 36.3992, lon: 25.4793, factor: 1.05 } },
    { city: 'Mykonos', hub: { iata: 'JMK', lat: 37.4351, lon: 25.3481, factor: 1.08 } },
    { city: 'Crete (Heraklion)', hub: { iata: 'HER', lat: 35.3397, lon: 25.1803, factor: 1.05 } },
  ],
  Türkiye: [
    { city: 'Istanbul', hub: { iata: 'IST', lat: 41.2753, lon: 28.7519, factor: 0.95 } },
    { city: 'Antalya', hub: { iata: 'AYT', lat: 36.8987, lon: 30.8005, factor: 1.05 } },
    { city: 'Bodrum', hub: { iata: 'BJV', lat: 37.2506, lon: 27.6670, factor: 1.05 } },
  ],
  Germany: [
    { city: 'Berlin', hub: { iata: 'BER', lat: 52.3667, lon: 13.5033, factor: 0.95 } },
    { city: 'Munich', hub: { iata: 'MUC', lat: 48.3538, lon: 11.7861, factor: 1.0 } },
    { city: 'Frankfurt', hub: { iata: 'FRA', lat: 50.0379, lon: 8.5622, factor: 0.95 } },
  ],
  Switzerland: [
    { city: 'Zurich', hub: { iata: 'ZRH', lat: 47.4581, lon: 8.5555, factor: 1.15 } },
    { city: 'Geneva', hub: { iata: 'GVA', lat: 46.2381, lon: 6.1089, factor: 1.15 } },
  ],
  Austria: [
    { city: 'Vienna', hub: { iata: 'VIE', lat: 48.1103, lon: 16.5697, factor: 1.0 } },
    { city: 'Salzburg', hub: { iata: 'SZG', lat: 47.7933, lon: 13.0033, factor: 1.05 } },
  ],
  'United Kingdom': [
    { city: 'London', hub: { iata: 'LTN', lat: 51.8740, lon: -0.3683, factor: 0.9 } },
    { city: 'Manchester', hub: { iata: 'MAN', lat: 53.3650, lon: -2.2720, factor: 0.95 } },
    { city: 'Edinburgh', hub: { iata: 'EDI', lat: 55.9500, lon: -3.3720, factor: 1.0 } },
  ],
};

const POPULAR_DESTINATIONS = [
  { city: 'Paris', country: 'France', color: 'from-rose-400 to-orange-300' },
  { city: 'Tokyo', country: 'Japan', color: 'from-purple-500 to-indigo-500' },
  { city: 'Bali', country: 'Indonesia', color: 'from-emerald-500 to-lime-400' },
  { city: 'New York', country: 'USA', color: 'from-sky-500 to-blue-500' },
];

const HOME_IMAGES_BUCKET = 'home-page-images';

const VALUE_CARDS = [
  {
    key: 'search',
    title: 'Expert Planning',
    body: 'Travel experts craft every itinerary to your style, pace, and budget.',
  },
  {
    key: 'award',
    title: 'Best Value',
    body: 'Competitive pricing with transparent cost breakdowns and smart tweaks.',
  },
  {
    key: 'compass',
    title: 'Full Support',
    body: '24/7 assistance before, during, and after your journey.',
  },
];

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const REGION_TO_COUNTRY = {
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  IE: 'Ireland',
  FR: 'France',
  DE: 'Germany',
  IT: 'Italy',
  ES: 'Spain',
  PT: 'Portugal',
  NL: 'Netherlands',
  BE: 'Belgium',
  SE: 'Sweden',
  NO: 'Norway',
  FI: 'Finland',
  DK: 'Denmark',
  IS: 'Iceland',
  GR: 'Greece',
  TR: 'Türkiye',
  SI: 'Slovenia',
  SK: 'Slovakia',
  HR: 'Croatia',
  AT: 'Austria',
  CH: 'Switzerland',
  PL: 'Poland',
  CZ: 'Czechia',
  HU: 'Hungary',
  RO: 'Romania',
  BG: 'Bulgaria',
  RS: 'Serbia',
  BA: 'Bosnia and Herzegovina',
  AL: 'Albania',
  MK: 'North Macedonia',
  UA: 'Ukraine',
  RU: 'Russia',
  GE: 'Georgia',
  AM: 'Armenia',
  AZ: 'Azerbaijan',
  KZ: 'Kazakhstan',
  MT: 'Malta',
  CY: 'Cyprus',
  AD: 'Andorra',
  LI: 'Liechtenstein',
  LU: 'Luxembourg',
  MC: 'Monaco',
  SM: 'San Marino',
  VA: 'Vatican City',
  MD: 'Moldova',
  EE: 'Estonia',
  LV: 'Latvia',
  LT: 'Lithuania',
};

const TZ_TO_COUNTRY = {
  'Europe/London': 'United Kingdom',
  'Europe/Dublin': 'Ireland',
  'Europe/Paris': 'France',
  'Europe/Berlin': 'Germany',
  'Europe/Rome': 'Italy',
  'Europe/Madrid': 'Spain',
  'Europe/Lisbon': 'Portugal',
  'Europe/Amsterdam': 'Netherlands',
  'Europe/Brussels': 'Belgium',
  'Europe/Stockholm': 'Sweden',
  'Europe/Oslo': 'Norway',
  'Europe/Helsinki': 'Finland',
  'Europe/Copenhagen': 'Denmark',
  'Atlantic/Reykjavik': 'Iceland',
  'Europe/Athens': 'Greece',
  'Europe/Istanbul': 'Türkiye',
  'Europe/Vienna': 'Austria',
  'Europe/Zurich': 'Switzerland',
  'Europe/Warsaw': 'Poland',
  'Europe/Prague': 'Czechia',
  'Europe/Budapest': 'Hungary',
  'Europe/Bucharest': 'Romania',
  'Europe/Sofia': 'Bulgaria',
  'Europe/Belgrade': 'Serbia',
  'Europe/Sarajevo': 'Bosnia and Herzegovina',
  'Europe/Tirane': 'Albania',
  'Europe/Skopje': 'North Macedonia',
  'Europe/Kiev': 'Ukraine',
  'Europe/Moscow': 'Russia',
  'Europe/Tbilisi': 'Georgia',
  'Asia/Yerevan': 'Armenia',
  'Asia/Baku': 'Azerbaijan',
  'Asia/Almaty': 'Kazakhstan',
  'Europe/Malta': 'Malta',
  'Asia/Nicosia': 'Cyprus',
  'Europe/Luxembourg': 'Luxembourg',
  'Europe/Vaduz': 'Liechtenstein',
  'Europe/Monaco': 'Monaco',
  'Europe/San_Marino': 'San Marino',
  'Europe/Vatican': 'Vatican City',
  'Europe/Chisinau': 'Moldova',
  'Europe/Tallinn': 'Estonia',
  'Europe/Riga': 'Latvia',
  'Europe/Vilnius': 'Lithuania',
};

function formatDateInput(date) {
  return date.toISOString().split('T')[0];
}

function getDefaultDates() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() + 14); // default two weeks out
  const end = new Date(start);
  end.setDate(start.getDate() + 3); // default 3-day getaway
  return { start: formatDateInput(start), end: formatDateInput(end) };
}

function guessBrowserCountry() {
  if (typeof navigator === 'undefined') return '';
  let region = '';

  const lang = navigator.language || (Array.isArray(navigator.languages) ? navigator.languages[0] : '');
  if (lang && lang.includes('-')) {
    const parts = lang.split('-');
    region = parts[parts.length - 1].toUpperCase();
  }
  if (region && REGION_TO_COUNTRY[region]) {
    return REGION_TO_COUNTRY[region];
  }

  const tz = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone;
  if (tz && TZ_TO_COUNTRY[tz]) {
    return TZ_TO_COUNTRY[tz];
  }

  return '';
}

function daysBetweenDates(startValue, endValue) {
  const start = toDate(startValue);
  const end = toDate(endValue);
  if (!start || !end) return 1;
  const day = 1000 * 60 * 60 * 24;
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / day);
  return Math.max(1, diffDays || 1);
}

function monthsInRange(start, end) {
  const months = [];
  if (!start || !end) return months;
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMarker = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= endMarker) {
    months.push(cursor.getMonth());
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function deriveSeasonality(destinationCountry, startValue, endValue) {
  const start = toDate(startValue);
  const end = toDate(endValue);
  if (!start || !end) return { factor: 1.0, label: 'Standard season' };

  const months = monthsInRange(start, end);
  const isSummer = SUMMER_HEAVY_DESTINATIONS.has(destinationCountry);
  const isWinter = WINTER_HEAVY_DESTINATIONS.has(destinationCountry);

  let factor = 1.0;
  let label = 'Standard season';
  const apply = (nextFactor, nextLabel) => {
    if (nextFactor > factor) {
      factor = nextFactor;
      label = nextLabel;
    }
  };

  if (isSummer) {
    if (months.some((m) => PEAK_SUMMER_MONTHS.includes(m))) {
      apply(1.45, 'Peak summer');
    } else if (months.some((m) => SHOULDER_SUMMER_MONTHS.includes(m))) {
      apply(1.2, 'Warm shoulder');
    } else {
      apply(0.95, 'Off-season');
    }
  }

  if (isWinter) {
    if (months.some((m) => PEAK_WINTER_MONTHS.includes(m))) {
      apply(1.3, 'Peak winter');
    } else if (months.some((m) => SHOULDER_WINTER_MONTHS.includes(m))) {
      apply(1.12, 'Cool shoulder');
    }
  }

  if (!isSummer && months.some((m) => m === 6 || m === 7)) {
    apply(1.18, 'High summer demand');
  }

  return { factor: Number(factor.toFixed(2)), label };
}

function rangeTouchesDays(start, end, daysOfWeek) {
  if (!start || !end) return false;
  const day = 1000 * 60 * 60 * 24;
  for (let ts = start.getTime(); ts <= end.getTime(); ts += day) {
    const dow = new Date(ts).getDay();
    if (daysOfWeek.includes(dow)) return true;
  }
  return false;
}

function deriveWeekendFactor(startValue, endValue) {
  const start = toDate(startValue);
  const end = toDate(endValue);
  if (!start || !end) return { factor: 1.0, label: 'Weekday travel' };

  const weekendDays = [5, 6, 0]; // Fri/Sat/Sun
  const startIsWeekend = weekendDays.includes(start.getDay());
  const endIsWeekend = weekendDays.includes(end.getDay());
  const touchesWeekend = startIsWeekend || endIsWeekend;

  return touchesWeekend
    ? { factor: 1.1, label: 'Weekend travel' }
    : { factor: 1.0, label: 'Weekday travel' };
}

const DEFAULT_DATES = getDefaultDates();

function getDestinationHub(country, city) {
  const cityList = DESTINATION_CITIES[country] ?? [];
  const match = cityList.find((c) => c.city === city);
  if (match?.hub) return match.hub;
  return COUNTRY_HUBS[country] ?? null;
}

function labelForDestination(country, city) {
  return city ? `${city}, ${country}` : country;
}

async function getAllHomeImages(supabase) {
  if (!supabase) return [];

  const { data, error } = await supabase.storage
    .from(HOME_IMAGES_BUCKET)
    .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .filter((file) => file && file.name && !file.name.endsWith('/'))
    .map((file) => {
      const { data: publicData } = supabase.storage
        .from(HOME_IMAGES_BUCKET)
        .getPublicUrl(file.name);
      return publicData?.publicUrl ?? null;
    })
    .filter(Boolean);
}

export default function Home() {
  const router = useRouter();
  // --- form state ---
  const [destinationCountry, setDestinationCountry] = useState('Slovenia');
  const [destinationCity, setDestinationCity] = useState('');
  const [budgetTotal, setBudgetTotal] = useState(500);
  const [startDate, setStartDate] = useState(DEFAULT_DATES.start);
  const [endDate, setEndDate] = useState(DEFAULT_DATES.end);
  const [homeCountry, setHomeCountry] = useState('');
  const [travelStyle, setTravelStyle] = useState('value');
  const [homePrefilled, setHomePrefilled] = useState(false);

  const [showResult, setShowResult] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState(null);
  const [pendingTrip, setPendingTrip] = useState(null);
  const [popularImages, setPopularImages] = useState([]);
  const destinationOptions = useMemo(() => buildDestinationList(), []);

  const tripLengthDays = useMemo(
    () => daysBetweenDates(startDate, endDate),
    [startDate, endDate]
  );

  // --- compute result model when needed ---
  const result = useMemo(() => {
    const { perDay, bucket, accom, other, styleLabel } =
      getDailyBreakdown(destinationCountry, travelStyle);

    const seasonality = deriveSeasonality(destinationCountry, startDate, endDate);
    const weekend = deriveWeekendFactor(startDate, endDate);
    const destHubOverride = getDestinationHub(destinationCountry, destinationCity);

    const flight = estimateReturnFare(homeCountry, destinationCountry, {
      seasonFactor: seasonality.factor,
      weekendFactor: weekend.factor,
      destHubOverride,
    });

    const totalLow  = perDay * tripLengthDays + flight.low;
    const totalHigh = perDay * tripLengthDays + flight.high;
    const fits = budgetTotal >= totalHigh;

    let suggestion = '';
    if (!fits) {
      let d = tripLengthDays;
      for (; d >= 1; d--) {
        if ((perDay * d) + flight.high <= budgetTotal) break;
      }
      suggestion =
        d >= 1
          ? `Try ${d} day${d === 1 ? '' : 's'} or raise budget to ~€${Math.round(totalHigh)}.`
          : `Budget is tight. Consider a cheaper destination or raise budget to ~€${Math.round(totalHigh)}.`;
    }

    return {
      perDay,
      bucket,
      accom,
      other,
      styleLabel,
      flight,
      totalLow,
      totalHigh,
      fits,
      suggestion,
      seasonality,
      weekend,
      destinationCity,
      destinationLabel: labelForDestination(destinationCountry, destinationCity),
    };
  }, [destinationCountry, destinationCity, homeCountry, tripLengthDays, budgetTotal, travelStyle, startDate, endDate]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        setAuthReady(true);
      }
    );
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    function handleHomeNav() {
      if (showResult) {
        setShowResult(false);
      }
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
    window.addEventListener('glb-nav-home', handleHomeNav);
    return () => {
      window.removeEventListener('glb-nav-home', handleHomeNav);
    };
  }, [showResult]);

  useEffect(() => {
    if (!user || homePrefilled) return;
    const profile = composeProfilePayload(user);
    if (profile.homeCountry) {
      setHomeCountry(profile.homeCountry);
      setHomePrefilled(true);
    }
  }, [user, homePrefilled]);

  useEffect(() => {
    let cancelled = false;
    if (homePrefilled || user) return;

    async function hydrateFromGeo() {
      try {
        const res = await fetch('/api/country');
        if (!res.ok) throw new Error('geo lookup failed');
        const data = await res.json();
        const code = (data?.country || '').toUpperCase();
        const mapped = code ? REGION_TO_COUNTRY[code] ?? code : '';
        if (!cancelled && mapped && mapped !== 'Unknown') {
          setHomeCountry(mapped);
          setHomePrefilled(true);
          return;
        }
      } catch (_err) {
        // noop
      }
      if (cancelled) return;
      const guess = guessBrowserCountry();
      if (guess) {
        setHomeCountry(guess);
        setHomePrefilled(true);
      }
    }

    hydrateFromGeo();
    return () => {
      cancelled = true;
    };
  }, [homePrefilled, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadImages() {
      try {
        const urls = await getAllHomeImages(supabase);
        if (!cancelled) {
          setPopularImages(urls);
        }
      } catch (err) {
        console.error('Failed to load home images', err);
      }
    }

    loadImages();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function handleStartDateChange(value) {
    const next = value || '';
    setStartDate(next);
    const start = toDate(next);
    const currentEnd = toDate(endDate);
    if (start && currentEnd && start > currentEnd) {
      const adjusted = new Date(start);
      adjusted.setDate(start.getDate() + 1);
      setEndDate(formatDateInput(adjusted));
    }
  }

  function handleEndDateChange(value) {
    const next = value || '';
    const start = toDate(startDate);
    const parsed = toDate(next);
    if (start && parsed && parsed < start) {
      setEndDate(formatDateInput(start));
      return;
    }
    setEndDate(next);
  }

  function persistTrip(payload) {
    if (!payload) return;
    sessionStorage.setItem('glb-pending-trip', JSON.stringify(payload));
    router.push('/trip/request');
  }

  function handleRequestTrip(payload) {
    setPendingTrip(payload);
    if (!authReady || !user) {
      setAuthIntent('request');
      setAuthModalOpen(true);
      return;
    }
    persistTrip(payload);
  }

  function handleAuthSuccess(profile) {
    setAuthModalOpen(false);
    if (profile?.homeCountry) {
      setHomeCountry(profile.homeCountry);
      setHomePrefilled(true);
    }
    setUser((prev) => prev ?? profile.user ?? null);
    if (authIntent === 'request' && pendingTrip) {
      setTimeout(() => {
        try {
          persistTrip(pendingTrip);
        } catch (err) {
          console.error('Failed to continue after auth', err);
        }
      }, 0);
    }
  }

  return (
    <main className="relative min-h-screen bg-[#FFF7F1] text-[#0F172A]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] rounded-b-[48px] bg-gradient-to-r from-[#FF9B66] via-[#FF7B42] to-[#FF6B35] opacity-90 shadow-[0_26px_120px_-60px_rgba(255,107,53,0.35)]" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 pb-32 pt-20 sm:px-6 lg:px-8">
        <section className="relative">
          <div
            className="absolute inset-x-6 -top-14 h-24 rounded-3xl bg-white/35 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative z-20 mb-12 text-center text-white">
            <h1 className="text-3xl font-semibold leading-tight drop-shadow-md sm:text-4xl">
              Plan Your Next Holiday
            </h1>
          </div>
          <div className="relative z-10 -mt-6 sm:-mt-10">
            {!showResult ? (
              <FormCard
                destinationCountry={destinationCountry}
                setDestinationCountry={setDestinationCountry}
                destinationCity={destinationCity}
                setDestinationCity={setDestinationCity}
                destinationOptions={destinationOptions}
                budgetTotal={budgetTotal}
                setBudgetTotal={setBudgetTotal}
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                homeCountry={homeCountry}
                setHomeCountry={setHomeCountry}
                travelStyle={travelStyle}
                setTravelStyle={setTravelStyle}
                onSubmit={() => setShowResult(true)}
              />
            ) : (
              <ResultCard
                destinationCountry={destinationCountry}
                destinationCity={destinationCity}
                homeCountry={homeCountry}
                startDate={startDate}
                endDate={endDate}
                tripLengthDays={tripLengthDays}
                budgetTotal={budgetTotal}
                result={result}
                onBack={() => setShowResult(false)}
                onRequest={handleRequestTrip}
              />
            )}
          </div>
        </section>

        {!showResult ? (
          <>
            <PopularDestinations images={popularImages} />
            <ValueProps />
          </>
        ) : null}

        <p className="text-xs text-[#4C5A6B] text-center">
          Prototype. Prices are estimates; seasons and luggage can change totals.
        </p>
      </div>
      {authModalOpen ? (
        <AuthOverlay onClose={() => setAuthModalOpen(false)}>
          <AuthForm
            supabase={supabase}
            defaultHomeCountry={homeCountry}
            initialMode="signin"
            onRequestSignup={() => {
              setAuthModalOpen(false);
              router.push('/account');
            }}
            onSuccess={handleAuthSuccess}
          />
        </AuthOverlay>
      ) : null}
    </main>
  );
}

/* -------------------- Form -------------------- */
function FormCard({
  destinationCountry,
  setDestinationCountry,
  destinationCity,
  setDestinationCity,
  destinationOptions = [],
  budgetTotal,
  setBudgetTotal,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  homeCountry,
  setHomeCountry,
  travelStyle,
  setTravelStyle,
  onSubmit,
}) {
  const today = formatDateInput(new Date());
  const destinationValue = encodeDestination(destinationCountry, destinationCity);
  return (
    <form
      className="relative rounded-[32px] border border-[#E3E6EF] bg-white p-6 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.35)] backdrop-blur-sm ring-1 ring-white/70 space-y-6 sm:p-7"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex w-full flex-col gap-2">
          <label className="text-sm font-medium text-[#4B5563]">Home</label>
          <select
            className="w-full rounded-2xl border border-[#E3E6EF] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] shadow-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
            value={homeCountry || ''}
            onChange={(e) => setHomeCountry(e.target.value)}
          >
            <option value="" disabled>
              Select your country
            </option>
            {EUROPE_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full flex-col gap-2">
          <label className="text-sm font-medium text-[#4B5563]">
            Where do you want to go?
          </label>
          <CascadingDestinationSelect
            options={destinationOptions}
            value={destinationValue}
            onChange={(next) => {
              const { country, city } = decodeDestination(next);
              setDestinationCountry(country);
              setDestinationCity(city);
            }}
          />
        </div>
        <div className="flex w-full flex-col gap-2">
          <label className="text-sm font-medium text-[#4B5563]">Start date</label>
          <input
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="rounded-2xl border border-[#E3E6EF] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] shadow-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
          />
        </div>
        <div className="flex w-full flex-col gap-2">
          <label className="text-sm font-medium text-[#4B5563]">End date</label>
          <input
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="rounded-2xl border border-[#E3E6EF] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] shadow-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium flex justify-between text-[#4B5563]">
          <span>Budget (total)</span>
          <span className="font-semibold text-neutral-800">€{budgetTotal}</span>
        </label>
        <input
          type="range"
          min="100"
          max="2000"
          step="50"
          value={budgetTotal}
          onChange={(e) => setBudgetTotal(parseInt(e.target.value, 10))}
          className="w-full accent-[#FF6B35]"
        />
        <div className="flex justify-between text-[11px] text-[#4B5563]">
          <span>€100</span>
          <span>€2000</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[#4B5563]">Travel style</label>
        <StyleToggle value={travelStyle} onChange={setTravelStyle} />
      </div>

      <button
        type="submit"
        className="w-full rounded-2xl bg-gradient-to-r from-[#FF8A3C] via-[#FF6B35] to-[#FF5B24] py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:from-[#FF9B55] hover:via-[#FF6B35] hover:to-[#FF4A12] focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
      >
        Get instant estimate
      </button>
    </form>
  );
}

function StyleToggle({ value, onChange }) {
  const items = [
    { k: 'shoestring', label: STYLE_PRESETS.shoestring.label, hint: '−€25/day' },
    { k: 'value',      label: STYLE_PRESETS.value.label,      hint: 'baseline' },
    { k: 'comfort',    label: STYLE_PRESETS.comfort.label,    hint: '+€40/day' }
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(it => {
        const active = value === it.k;
        return (
          <button
            key={it.k}
            type="button"
            onClick={() => onChange(it.k)}
            className={`rounded-2xl px-3 py-2 text-sm font-semibold border transition ${
              active
                ? 'border-[#FF6B35] bg-[#FFF4E8] text-[#C2461E] shadow-lg shadow-orange-100'
                : 'border-[#E3E6EF] bg-white text-[#4B5563] hover:text-[#0F172A]'
            }`}
            title={it.hint}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function PopularDestinations({ images = [] }) {
  const hasImages = Array.isArray(images) && images.length > 0;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
        <span className="text-orange-500">↗</span> Popular Destinations
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {POPULAR_DESTINATIONS.map((item, index) => {
          const imageUrl = hasImages ? images[index % images.length] : null;
          const backgroundClass = imageUrl
            ? 'h-48 bg-cover bg-center'
            : `h-48 bg-gradient-to-r ${item.color}`;

          return (
            <div
              key={item.city}
              className="group overflow-hidden rounded-2xl border border-white/70 bg-white shadow-lg shadow-slate-100 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-100"
            >
              <div
                className={`${backgroundClass} transition-transform duration-300 group-hover:scale-105`}
                style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
              />
              <div className="space-y-1 p-3">
                <p className="text-sm font-semibold text-neutral-900">{item.city}</p>
                <p className="text-xs text-[#4C5A6B]">{item.country}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ValueProps() {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
        <span className="text-orange-500">◎</span> Why travel with us?
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {VALUE_CARDS.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-white/70 bg-white/90 p-4 text-center shadow-lg shadow-orange-50 space-y-2"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-500">
              <ValueIcon name={card.key} />
            </div>
            <p className="text-sm font-semibold text-neutral-900">{card.title}</p>
            <p className="text-xs text-[#4C5A6B]">{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------- Result Screen -------------------- */
function ResultCard({
  destinationCountry,
  destinationCity,
  homeCountry,
  startDate,
  endDate,
  tripLengthDays,
  budgetTotal,
  result,
  onBack,
  onRequest,
}) {
  const {
    bucket,
    accom,
    other,
    styleLabel,
    flight,
    totalLow,
    totalHigh,
    fits,
    suggestion,
  } = result;
  const [isContinuing, setIsContinuing] = useState(false);
  const [continueError, setContinueError] = useState('');
  const flightsEstimate = flight.high ?? flight.low ?? 0;
  const accommodationEstimate = accom * tripLengthDays;
  const activitiesEstimate = other * tripLengthDays;
  const totalEstimate = flightsEstimate + accommodationEstimate + activitiesEstimate;
  const dateRangeLabel = formatDateRange(startDate, endDate);
  const destinationLabel = destinationCity ? `${destinationCity}, ${destinationCountry}` : destinationCountry;
  const destinationLabelShort = destinationLabel || destinationCountry;
  const handleContinue = () => {
    if (isContinuing) return;
    setIsContinuing(true);
    setContinueError('');
    try {
      onRequest?.({
        destinationCountry,
        destinationCity,
        homeCountry,
        startDate,
        endDate,
        tripLengthDays,
        budgetTotal,
        result,
      });
    } catch (err) {
      console.error('Failed to continue', err);
      setContinueError(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsContinuing(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-[32px] border border-white/80 bg-white p-6 shadow-xl shadow-orange-100/50 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#FF6B35]">
              Instant estimate
            </p>
            <h2 className="text-xl font-semibold text-neutral-900">{destinationLabelShort}</h2>
            <p className="text-sm text-[#4C5A6B]">{dateRangeLabel}</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-[1px] hover:border-orange-200 hover:text-[#C2461E]"
            onClick={onBack}
          >
            <span className="text-sm">✎</span>
            <span>Edit answers</span>
          </button>
        </div>

        <div className="rounded-2xl border border-orange-50 bg-gradient-to-br from-[#FFF4E8] via-white to-[#FFF9F3] p-5 shadow-inner shadow-orange-100/50">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-[#C2461E]">Estimated total</p>
              <p className="text-4xl font-semibold text-neutral-900">{euro(totalEstimate)}</p>
              <p className="text-sm text-[#4C5A6B]">
                {tripLengthDays} day{tripLengthDays === 1 ? '' : 's'} • {bucket}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-[#C2461E]">
                Travel style: {styleLabel}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-[#4C5A6B]">
                Pricing auto-adjusts for your dates
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <EstimateRow
            icon="flight"
            label="Flights"
            value={euro(flightsEstimate)}
            color="text-sky-600"
          />
          <EstimateRow
            icon="stay"
            label="Accommodation"
            value={euro(accommodationEstimate)}
            color="text-indigo-600"
          />
          <EstimateRow
            icon="fun"
            label="Activities & experiences"
            value={euro(activitiesEstimate)}
            color="text-emerald-600"
          />
        </div>

        {continueError && <div className="text-sm text-red-500">{continueError}</div>}
        <button
          className={`w-full rounded-2xl py-3 text-sm font-semibold transition ${
            isContinuing
              ? 'cursor-not-allowed bg-slate-200 text-[#4C5A6B]'
              : 'bg-gradient-to-r from-[#FF8A3C] via-[#FF6B35] to-[#FF5B24] text-white shadow-lg shadow-orange-200 hover:from-[#FF9B55] hover:via-[#FF6B35] hover:to-[#FF4A12]'
          }`}
          onClick={handleContinue}
          disabled={isContinuing}
        >
          {isContinuing ? 'Opening form…' : 'Request itinerary →'}
        </button>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 text-sm p-3">
          This is an estimated range. Final pricing will be refined once we review your dates and
          must-haves.
        </div>

        <div className="rounded-2xl border border-white/80 bg-white p-4 shadow-inner shadow-orange-50 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#4C5A6B]">Budget check</p>
              <p className="text-lg font-semibold text-neutral-900">
                {euro(totalLow)} – {euro(totalHigh)}
              </p>
              <p className="text-sm text-[#4C5A6B]">Your budget: {euro(budgetTotal)}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                fits
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-rose-50 text-rose-700 border border-rose-100'
              }`}
            >
              {fits ? 'Within budget' : 'Needs tweaks'}
            </span>
          </div>

          <BudgetGauge budget={budgetTotal} low={totalLow} high={totalHigh} />

          <div
            className={`text-sm font-semibold ${
              fits ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {fits ? 'This fits your budget.' : `Over budget. ${suggestion}`}
          </div>
        </div>
      </div>
    </section>
  );
}

function BudgetGauge({ budget, low, high }) {
  const max = Math.max(budget, high) * 1.25;
  const pctBudget = clamp((budget / max) * 100, 0, 100);
  const pctLow = clamp((low / max) * 100, 0, 100);
  const pctHigh = clamp((high / max) * 100, 0, 100);

  return (
    <div className="mt-2">
      <div className="relative h-3 w-full rounded-full bg-white">
        <div
          className="absolute inset-y-0 bg-slate-300/70"
          style={{ left: `${pctLow}%`, width: `${Math.max(pctHigh - pctLow, 2)}%` }}
          title="Estimated total range"
        />
        <div
          className="absolute top-[-4px] h-5 w-[2px] bg-[#FF6B35]"
          style={{ left: `calc(${pctBudget}% - 1px)` }}
          title="Your budget"
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-[#4C5A6B]">
        <span>0</span>
        <span>max {euro(Math.round(max))}</span>
      </div>
    </div>
  );
}

function formatDateRange(startValue, endValue) {
  const start = toDate(startValue);
  const end = toDate(endValue);
  if (!start && !end) return 'Dates pending';
  if (start && !end) {
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (!start && end) {
    return end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
  const endLabel = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startLabel} – ${endLabel}`;
}

function euro(n) { return '€' + Math.round(n); }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

const BREAKDOWN_ICONS = {
  flight: (props) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  ),
  stay: (props) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M10 22v-6.57" />
      <path d="M12 11h.01" />
      <path d="M12 7h.01" />
      <path d="M14 15.43V22" />
      <path d="M15 16a5 5 0 0 0-6 0" />
      <path d="M16 11h.01" />
      <path d="M16 7h.01" />
      <path d="M8 11h.01" />
      <path d="M8 7h.01" />
      <rect x="4" y="2" width="16" height="20" rx="2" />
    </svg>
  ),
  fun: (props) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  ),
};

function BreakdownIcon({ name, className }) {
  const Icon = BREAKDOWN_ICONS[name];
  if (!Icon) return null;
  return <Icon className={className} aria-hidden="true" />;
}

function EstimateRow({ label, value, color, icon }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3 text-sm font-semibold text-neutral-800">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 ${color}`}
        >
          {icon ? <BreakdownIcon name={icon} className="h-5 w-5" /> : <span>•</span>}
        </div>
        <span>{label}</span>
      </div>
      <div className="text-sm font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

const ICONS = {
  search: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" strokeLinecap="round" />
    </svg>
  ),
  award: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M8 13l-1 7 5-3 5 3-1-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  compass: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M10 10l5-2-2 5-5 2z" strokeLinejoin="round" />
    </svg>
  ),
};

function ValueIcon({ name }) {
  const Icon = ICONS[name];
  if (!Icon) return null;
  return <Icon className="h-5 w-5" aria-hidden="true" />;
}

function AuthOverlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md">
        <button
          type="button"
          className="absolute -top-3 -right-3 h-9 w-9 rounded-full bg-white border border-orange-100 text-[#4C5A6B] shadow-lg shadow-orange-100 hover:text-[#C2461E]"
          onClick={onClose}
        >
          ×
        </button>
        <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-2xl shadow-orange-100/60">
          {children}
        </div>
      </div>
    </div>
  );
}

function encodeDestination(country, city) {
  return `${country}|||${city || ''}`;
}

function decodeDestination(value) {
  if (!value) return { country: '', city: '' };
  const [country, city] = value.split('|||');
  return { country, city };
}

function buildDestinationList() {
  return EUROPE_COUNTRIES.map((country) => {
    const cities = DESTINATION_CITIES[country] ?? [];
    return {
      country,
      options: cities.map((item) => ({
        city: item.city,
        value: encodeDestination(country, item.city),
        label: `${item.city}, ${country}`,
      })),
    };
  });
}

function CascadingDestinationSelect({ options = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState('');
  const { country, city } = decodeDestination(value);
  const selectedLabel = labelForDestination(country, city) || 'Select destination';
  const activeCountry = expanded;
  const activeCities = options.find((opt) => opt.country === activeCountry)?.options ?? [];

  return (
    <div className="relative">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{selectedLabel}</span>
        <span className="text-[#4C5A6B] text-sm">▾</span>
      </button>
      {open ? (
        <div
          className="absolute z-30 mt-2 w-full sm:w-[520px] overflow-visible rounded-2xl border border-slate-200 bg-white shadow-xl shadow-orange-100"
        >
          <div className="flex max-h-64 overflow-hidden">
            <div className="w-1/2 overflow-auto border-r border-slate-100 py-1">
              {options.map((opt) => {
                const hasCities = Array.isArray(opt.options) && opt.options.length > 0;
                const isActive = activeCountry === opt.country;
                return (
                  <button
                    key={opt.country}
                    type="button"
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                      isActive ? 'bg-orange-50 text-neutral-900' : 'hover:bg-orange-50'
                    }`}
                    onClick={() => {
                      if (hasCities) {
                        setExpanded(opt.country);
                        return;
                      }
                      onChange(encodeDestination(opt.country, ''));
                      setOpen(false);
                    }}
                  >
                    <span>{opt.country}</span>
                    {hasCities ? (
                      <span className="text-[#4C5A6B] text-xs">▸</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="w-1/2 overflow-auto bg-slate-50 py-1">
              {activeCountry ? (
                <>
                  <div className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-[#4C5A6B]">
                    {activeCountry}
                  </div>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-orange-100"
                    onClick={() => {
                      onChange(encodeDestination(activeCountry, ''));
                      setOpen(false);
                      setExpanded('');
                    }}
                  >
                    <span>All of {activeCountry}</span>
                  </button>
                  {activeCities.map((cityOpt) => (
                    <button
                      key={cityOpt.value}
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-orange-100"
                      onClick={() => {
                        onChange(cityOpt.value);
                        setOpen(false);
                        setExpanded('');
                      }}
                    >
                      <span>{cityOpt.city}</span>
                    </button>
                  ))}
                </>
              ) : (
                <div className="px-4 py-2 text-sm text-[#4C5A6B]">Select a country</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
