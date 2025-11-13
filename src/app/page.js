'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EUROPE_COUNTRIES } from '@/lib/countries-europe';
import { getDailyBreakdown, STYLE_PRESETS } from '@/lib/pricing';
import { estimateReturnFare } from '@/lib/airfare';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import AuthForm from '@/components/auth/AuthForm';

const POPULAR_DESTINATIONS = [
  { city: 'Paris', country: 'France', color: 'from-rose-400 to-orange-300' },
  { city: 'Tokyo', country: 'Japan', color: 'from-purple-500 to-indigo-500' },
  { city: 'Bali', country: 'Indonesia', color: 'from-emerald-500 to-lime-400' },
  { city: 'New York', country: 'USA', color: 'from-sky-500 to-blue-500' },
];

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

export default function Home() {
  const router = useRouter();
  // --- form state ---
  const [destinationCountry, setDestinationCountry] = useState('Slovenia');
  const [budgetTotal, setBudgetTotal] = useState(500);
  const [tripLengthDays, setTripLengthDays] = useState(3);
  const [homeCountry, setHomeCountry] = useState('United Kingdom');
  const [travelStyle, setTravelStyle] = useState('value'); // NEW

  const [showResult, setShowResult] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState(null);
  const [pendingTrip, setPendingTrip] = useState(null);

  // --- compute result model when needed ---
  const result = useMemo(() => {
    const { perDay, bucket, accom, other, styleLabel } =
      getDailyBreakdown(destinationCountry, travelStyle);

    const flight = estimateReturnFare(homeCountry, destinationCountry);

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

    return { perDay, bucket, accom, other, styleLabel, flight, totalLow, totalHigh, fits, suggestion };
  }, [destinationCountry, homeCountry, tripLengthDays, budgetTotal, travelStyle]);

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
    <main className="relative min-h-screen bg-gradient-to-b from-[#E9F2FF] via-white to-[#FFF6ED] text-neutral-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pb-32 pt-12 sm:px-6 lg:px-8">
        <header className="text-center space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-500">
            Plan your perfect trip
          </p>
          <h1 className="text-3xl font-semibold text-neutral-900">
            Get instant estimates and expert-crafted itineraries
          </h1>
          <p className="text-sm text-neutral-500">
            Tell us the basics. We&apos;ll forecast costs and hand the rest to a travel specialist.
          </p>
        </header>

        {!showResult ? (
          <FormCard
            destinationCountry={destinationCountry}
            setDestinationCountry={setDestinationCountry}
            budgetTotal={budgetTotal}
            setBudgetTotal={setBudgetTotal}
            tripLengthDays={tripLengthDays}
            setTripLengthDays={setTripLengthDays}
            homeCountry={homeCountry}
            setHomeCountry={setHomeCountry}
            travelStyle={travelStyle}
            setTravelStyle={setTravelStyle}
            onSubmit={() => setShowResult(true)}
          />
        ) : (
          <ResultCard
            destinationCountry={destinationCountry}
            homeCountry={homeCountry}
            tripLengthDays={tripLengthDays}
            budgetTotal={budgetTotal}
            result={result}
            onBack={() => setShowResult(false)}
            onRequest={handleRequestTrip}
          />
        )}

        {!showResult ? (
          <>
            <PopularDestinations />
            <ValueProps />
          </>
        ) : null}

        <p className="text-xs text-neutral-500 text-center">
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
  budgetTotal,
  setBudgetTotal,
  tripLengthDays,
  setTripLengthDays,
  homeCountry,
  setHomeCountry,
  travelStyle,
  setTravelStyle,
  onSubmit,
}) {
  return (
    <form
      className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-xl shadow-orange-200/60 backdrop-blur-sm space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex w-full flex-col gap-2 sm:basis-3/4">
          <label className="text-sm font-medium text-neutral-500">
            Where do you want to go?
          </label>
          <select
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            value={destinationCountry}
            onChange={(e) => setDestinationCountry(e.target.value)}
          >
            {EUROPE_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full flex-col gap-2 sm:basis-1/4">
          <label className="text-sm font-medium text-neutral-500">Duration (days)</label>
          <input
            type="number"
            min="1"
            max="30"
            value={tripLengthDays}
            onChange={(e) => setTripLengthDays(parseInt(e.target.value, 10) || 1)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium flex justify-between text-neutral-500">
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
        <div className="flex justify-between text-[11px] text-neutral-400">
          <span>€100</span>
          <span>€2000</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-neutral-500">Travel style</label>
        <StyleToggle value={travelStyle} onChange={setTravelStyle} />
      </div>

      <button
        type="submit"
        className="w-full rounded-2xl bg-gradient-to-r from-[#FF8B55] to-[#FF6B35] py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:from-[#FF9B66] hover:to-[#FF5B24] focus:outline-none focus:ring-2 focus:ring-[#FFB08F]"
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
                ? 'border-[#FF6B35] bg-[#FFE7DA] text-[#C2461E] shadow-lg shadow-orange-100'
                : 'border-slate-200 bg-white text-neutral-600 hover:text-neutral-900'
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

function PopularDestinations() {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
        <span className="text-orange-500">↗</span> Popular Destinations
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {POPULAR_DESTINATIONS.map((item) => (
          <div
            key={item.city}
            className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-lg shadow-slate-100"
          >
            <div className={`h-24 bg-gradient-to-r ${item.color}`} />
            <div className="space-y-1 p-3">
              <p className="text-sm font-semibold text-neutral-900">{item.city}</p>
              <p className="text-xs text-neutral-500">{item.country}</p>
            </div>
          </div>
        ))}
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
            <p className="text-xs text-neutral-500">{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------- Result Screen -------------------- */
function ResultCard({
  destinationCountry,
  homeCountry,
  tripLengthDays,
  budgetTotal,
  result,
  onBack,
  onRequest,
}) {
  const { perDay, bucket, accom, other, styleLabel, flight, totalLow, totalHigh, fits, suggestion } =
    result;
  const [isContinuing, setIsContinuing] = useState(false);
  const [continueError, setContinueError] = useState('');
  const flightsEstimate = flight.high ?? flight.low ?? 0;
  const accommodationEstimate = accom * tripLengthDays;
  const activitiesEstimate = other * tripLengthDays;
  const totalEstimate = flightsEstimate + accommodationEstimate + activitiesEstimate;

  return (
    <section className="space-y-5">
      <div className="rounded-[32px] border border-white/80 bg-white p-6 shadow-xl shadow-orange-100/50 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Your instant estimate</h2>
            <p className="text-sm text-neutral-500">
              Based on your preferences for {destinationCountry}
            </p>
          </div>
          <button
            className="text-xs font-medium text-neutral-400 hover:text-neutral-700 underline"
            onClick={onBack}
          >
            ← edit answers
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center space-y-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Estimated total cost</p>
          <p className="text-4xl font-semibold text-neutral-900">{euro(totalEstimate)}</p>
          <p className="text-sm text-neutral-500">
            {bucket} • {tripLengthDays} day{tripLengthDays === 1 ? '' : 's'}
          </p>
        </div>

        <div className="space-y-3">
          <EstimateRow label="Flights" value={euro(flightsEstimate)} color="text-sky-500" />
          <EstimateRow
            label="Accommodation"
            value={euro(accommodationEstimate)}
            color="text-purple-500"
          />
          <EstimateRow
            label="Activities & experiences"
            value={euro(activitiesEstimate)}
            color="text-emerald-500"
          />
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 text-sm p-3">
          This is an estimated range. Final pricing will be refined once we review your dates and
          must-haves.
        </div>
      </div>

      <div className="rounded-[32px] border border-white/80 bg-white p-5 shadow-xl shadow-orange-100/50 space-y-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
          <div className="mb-2 flex justify-between">
            <span className="text-neutral-500">Estimated total</span>
            <span className="font-semibold text-neutral-900">
              {euro(totalLow)} – {euro(totalHigh)}
            </span>
          </div>
          <BudgetGauge budget={budgetTotal} low={totalLow} high={totalHigh} />
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-neutral-500">Your budget</span>
            <span className="font-semibold text-neutral-900">{euro(budgetTotal)}</span>
          </div>
          <div
            className={`mt-3 text-center text-sm font-semibold ${
              fits ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {fits ? 'This fits your budget.' : `Over budget. ${suggestion}`}
          </div>
        </div>

        <div className="text-center text-[13px] text-neutral-600">
          <div className="mb-1 font-semibold text-neutral-900">
            Ready to turn this into a personalised itinerary?
          </div>
          <div>
            Add your dates & specifics next—your travel specialist will take it from there.
          </div>
          {continueError && <div className="mt-3 text-sm text-red-500">{continueError}</div>}
          <button
            className={`mt-3 w-full rounded-2xl py-3 text-sm font-semibold transition ${
              isContinuing
                ? 'cursor-not-allowed bg-slate-200 text-neutral-500'
                : 'bg-gradient-to-r from-[#FF8B55] to-[#FF6B35] text-white shadow-lg shadow-orange-200 hover:from-[#FF9B66] hover:to-[#FF5B24]'
            }`}
            onClick={() => {
              if (isContinuing) return;
              setIsContinuing(true);
              setContinueError('');
              try {
                onRequest?.({
                  destinationCountry,
                  homeCountry,
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
            }}
            disabled={isContinuing}
          >
            {isContinuing ? 'Opening form…' : 'Continue →'}
          </button>
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
      <div className="mt-1 flex justify-between text-[11px] text-neutral-400">
        <span>0</span>
        <span>max {euro(Math.round(max))}</span>
      </div>
    </div>
  );
}

function euro(n) { return '€' + Math.round(n); }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function EstimateRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 shadow">
      <div className="flex items-center gap-3 text-sm font-semibold text-neutral-700">
        <span className={`text-lg ${color}`}>•</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="relative w-full max-w-md">
        <button
          type="button"
          className="absolute -top-3 -right-3 h-9 w-9 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white"
          onClick={onClose}
        >
          ×
        </button>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
