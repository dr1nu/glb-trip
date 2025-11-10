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
    title: 'Expert Planning',
    body: 'Travel experts craft every itinerary to your style, pace, and budget.',
  },
  {
    title: 'Best Value',
    body: 'Competitive pricing with transparent cost breakdowns and smart tweaks.',
  },
  {
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
    <main className="min-h-screen bg-neutral-900 text-neutral-100 p-4 flex justify-center">
      <div className="w-full max-w-3xl">
        <header className="mb-6 space-y-2 text-center">
          <h1 className="text-xl font-semibold">Plan a Budget Trip</h1>
          <p className="text-sm text-neutral-400">
            Answer 4 questions. See realistic costs instantly.
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

        <p className="text-[11px] text-neutral-600 text-center mt-6">
          Prototype. Prices are estimates; seasons and luggage can change totals.
        </p>
      </div>
      {authModalOpen ? (
        <AuthOverlay onClose={() => setAuthModalOpen(false)}>
          <AuthForm
            supabase={supabase}
            defaultCountry={homeCountry}
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
      className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">From</label>
          <select
            className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={homeCountry}
            onChange={(e) => setHomeCountry(e.target.value)}
          >
            {EUROPE_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">To</label>
          <select
            className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Days</label>
          <input
            type="number"
            min="1"
            max="30"
            value={tripLengthDays}
            onChange={(e) => setTripLengthDays(parseInt(e.target.value, 10) || 1)}
            className="bg-neutral-900 border border-neutral-700 text-neutral-100 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Travel style</label>
        <StyleToggle value={travelStyle} onChange={setTravelStyle} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium flex justify-between">
          <span>Total budget</span>
          <span className="font-semibold text-orange-400">€{budgetTotal}</span>
        </label>
        <input
          type="range"
          min="100"
          max="2000"
          step="50"
          value={budgetTotal}
          onChange={(e) => setBudgetTotal(parseInt(e.target.value, 10))}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-[11px] text-neutral-400">
          <span>€100</span>
          <span>€2000</span>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600 text-neutral-900 font-semibold text-sm py-3 rounded-xl transition-colors"
      >
        Generate my trip →
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
            className={`rounded-xl px-3 py-2 text-sm border ${
              active
                ? 'bg-orange-500 text-neutral-900 border-orange-500'
                : 'bg-neutral-900 text-neutral-200 border-neutral-700 hover:border-neutral-500'
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
    <section className="mt-8 space-y-3">
      <div className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
        <span className="text-blue-400">↗</span> Popular destinations
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {POPULAR_DESTINATIONS.map((item) => (
          <div
            key={item.city}
            className="bg-neutral-800 border border-neutral-700 rounded-2xl overflow-hidden"
          >
            <div className={`h-24 bg-gradient-to-r ${item.color}`} />
            <div className="p-3 space-y-1">
              <p className="text-sm font-semibold text-neutral-100">{item.city}</p>
              <p className="text-xs text-neutral-400">{item.country}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ValueProps() {
  return (
    <section className="mt-8 space-y-3">
      <div className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
        <span className="text-blue-400">◎</span> Why travel with us?
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {VALUE_CARDS.map((card) => (
          <div
            key={card.title}
            className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4 space-y-2 text-center"
          >
            <div className="h-10 w-10 mx-auto rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-blue-300">
              •
            </div>
            <p className="text-sm font-semibold text-neutral-100">{card.title}</p>
            <p className="text-xs text-neutral-400">{card.body}</p>
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
      <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Your instant estimate</h2>
            <p className="text-sm text-neutral-400">
              Based on your preferences for {destinationCountry}
            </p>
          </div>
          <button
            className="text-xs text-neutral-400 hover:text-neutral-200 underline"
            onClick={onBack}
          >
            ← edit answers
          </button>
        </div>

        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 text-center space-y-2">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Estimated total cost</p>
          <p className="text-4xl font-semibold">{euro(totalEstimate)}</p>
          <p className="text-sm text-neutral-400">
            {bucket} • {tripLengthDays} day{tripLengthDays === 1 ? '' : 's'}
          </p>
        </div>

        <div className="space-y-3">
          <EstimateRow label="Flights" value={euro(flightsEstimate)} color="text-sky-300" />
          <EstimateRow
            label="Accommodation"
            value={euro(accommodationEstimate)}
            color="text-purple-300"
          />
          <EstimateRow
            label="Activities & experiences"
            value={euro(activitiesEstimate)}
            color="text-emerald-300"
          />
        </div>

        <div className="rounded-xl border border-blue-400/20 bg-blue-500/5 text-blue-200 text-sm p-3">
          This is an estimated range. Final pricing will be refined once we review your dates and
          must-haves.
        </div>
      </div>

      <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4 space-y-4">
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-neutral-400">Estimated total</span>
            <span className="font-semibold">
              {euro(totalLow)} – {euro(totalHigh)}
            </span>
          </div>
          <BudgetGauge budget={budgetTotal} low={totalLow} high={totalHigh} />
          <div className="flex justify-between mt-3 text-sm">
            <span className="text-neutral-400">Your budget</span>
            <span className="font-semibold">{euro(budgetTotal)}</span>
          </div>
          <div
            className={`mt-3 text-center text-sm font-semibold ${
              fits ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {fits ? '✅ This fits your budget.' : `❌ Over budget. ${suggestion}`}
          </div>
        </div>

        <div className="text-center text-[13px] text-neutral-300">
          <div className="font-semibold mb-1">
            Ready to turn this into a personalised itinerary?
          </div>
          <div className="text-neutral-400">
            Add your dates & specifics next—your travel specialist will take it from there.
          </div>
          {continueError && <div className="mt-3 text-sm text-red-400">{continueError}</div>}
          <button
            className={`mt-3 w-full font-semibold text-sm py-3 rounded-xl transition-colors ${
              isContinuing
                ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-neutral-900'
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
      <div className="h-3 w-full bg-neutral-800 rounded-full relative overflow-hidden">
        <div
          className="absolute top-0 bottom-0 bg-neutral-600/60"
          style={{ left: `${pctLow}%`, width: `${Math.max(pctHigh - pctLow, 2)}%` }}
          title="Estimated total range"
        />
        <div
          className="absolute top-[-4px] h-5 w-[2px] bg-orange-400"
          style={{ left: `calc(${pctBudget}% - 1px)` }}
          title="Your budget"
        />
      </div>
      <div className="flex justify-between text-[11px] text-neutral-500 mt-1">
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
    <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3">
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className={`text-lg ${color}`}>•</span>
        <span className="text-neutral-100">{label}</span>
      </div>
      <div className="text-sm font-semibold text-neutral-100">{value}</div>
    </div>
  );
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
