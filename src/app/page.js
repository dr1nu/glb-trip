'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EUROPE_COUNTRIES } from '@/lib/countries-europe';
import { getDailyBreakdown, STYLE_PRESETS } from '@/lib/pricing';
import { estimateReturnFare } from '@/lib/airfare';

export default function Home() {
  // --- form state ---
  const [destinationCountry, setDestinationCountry] = useState('Slovenia');
  const [budgetTotal, setBudgetTotal] = useState(500);
  const [tripLengthDays, setTripLengthDays] = useState(3);
  const [homeCountry, setHomeCountry] = useState('United Kingdom');
  const [travelStyle, setTravelStyle] = useState('value'); // NEW

  const [showResult, setShowResult] = useState(false);

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

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-100 p-4 flex justify-center">
      <div className="w-full max-w-md">
        <header className="text-center mb-6">
          <h1 className="text-xl font-semibold">Plan a Budget Trip</h1>
          <p className="text-sm text-neutral-400 mt-1">
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
          />
        )}

        <p className="text-[11px] text-neutral-600 text-center mt-6">
          Prototype. Prices are estimates; seasons and luggage can change totals.
        </p>
      </div>
    </main>
  );
}

/* -------------------- Form -------------------- */
function FormCard({
  destinationCountry, setDestinationCountry,
  budgetTotal, setBudgetTotal,
  tripLengthDays, setTripLengthDays,
  homeCountry, setHomeCountry,
  travelStyle, setTravelStyle,
  onSubmit
}) {
  return (
    <form
      className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4 space-y-5"
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
    >
      {/* Destination */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Where do you want to go?</label>
        <select
          className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={destinationCountry}
          onChange={(e) => setDestinationCountry(e.target.value)}
        >
          {EUROPE_COUNTRIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Travel Style (NEW) */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Travel style</label>
        <StyleToggle value={travelStyle} onChange={setTravelStyle} />
      </div>

      {/* Budget */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium flex justify-between">
          <span>What is your total budget?</span>
          <span className="font-semibold text-orange-400">€{budgetTotal}</span>
        </label>
        <input
          type="range" min="100" max="2000" step="50"
          value={budgetTotal}
          onChange={(e) => setBudgetTotal(parseInt(e.target.value, 10))}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-[11px] text-neutral-400">
          <span>€100</span><span>€2000</span>
        </div>
      </div>

      {/* Trip length */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium flex justify-between">
          <span>How long do you want to go for?</span>
          <span className="font-semibold text-orange-400">{tripLengthDays} days</span>
        </label>
        <input
          type="range" min="1" max="15" step="1"
          value={tripLengthDays}
          onChange={(e) => setTripLengthDays(parseInt(e.target.value, 10))}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-[11px] text-neutral-400">
          <span>1</span><span>15</span>
        </div>
      </div>

      {/* Home country */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Where do you live?</label>
        <select
          className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          value={homeCountry}
          onChange={(e) => setHomeCountry(e.target.value)}
        >
          {EUROPE_COUNTRIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
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

/* -------------------- Result Screen -------------------- */
function ResultCard({ destinationCountry, homeCountry, tripLengthDays, budgetTotal, result, onBack }) {
  const { perDay, bucket, accom, other, styleLabel, flight, totalLow, totalHigh, fits, suggestion } = result;
  const router = useRouter();
  const [isContinuing, setIsContinuing] = useState(false);
  const [continueError, setContinueError] = useState('');

  const pendingTripPayload = {
    destinationCountry,
    homeCountry,
    tripLengthDays,
    budgetTotal,
    result,
  };

  function handleContinue() {
    if (isContinuing) return;
    setIsContinuing(true);
    setContinueError('');

    const STORAGE_KEY = 'glb-pending-trip';
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pendingTripPayload));
      router.push('/trip/request');
    } catch (err) {
      console.error('Failed to store pending trip', err);
      setContinueError(
        err instanceof Error
          ? err.message
          : 'Please enable storage to continue.'
      );
      setIsContinuing(false);
    }
  }

  return (
    <section className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trip Estimate</h2>
        <button
          className="text-xs text-neutral-400 hover:text-neutral-200 underline"
          onClick={onBack}
        >
          ← edit answers
        </button>
      </div>

      {/* Quick facts */}
      <div className="grid grid-cols-2 gap-3">
        <Fact label="Destination" value={destinationCountry} />
        <Fact label="Home" value={homeCountry} />
        <Fact label="Trip length" value={`${tripLengthDays} day${tripLengthDays === 1 ? '' : 's'}`} />
        <Fact label="Style" value={styleLabel} />
        <Fact label="Accommodation / night" value={`€${accom} (${bucket})`} />
        <Fact label="Food+Transport+Attractions" value={`€${other}/day`} />
        <Fact label="Flights est." value={`€${flight.low}–€${flight.high}`} />
        <Fact label="Route" value={`${flight.from} → ${flight.to}`} />
      </div>

      {/* Total range + gauge */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-sm">
        <div className="flex justify-between mb-2">
          <span className="text-neutral-400">Estimated total</span>
          <span className="font-semibold">{euro(totalLow)} – {euro(totalHigh)}</span>
        </div>
        <BudgetGauge budget={budgetTotal} low={totalLow} high={totalHigh} />
        <div className="flex justify-between mt-3 text-sm">
          <span className="text-neutral-400">Your budget</span>
          <span className="font-semibold">{euro(budgetTotal)}</span>
        </div>
        <div className={`mt-3 text-center text-sm font-semibold ${fits ? 'text-green-400' : 'text-red-400'}`}>
          {fits ? '✅ This fits your budget.' : `❌ Over budget. ${suggestion}`}
        </div>
      </div>

    

      {/* CTA stub */}
      <div className="text-center text-[13px] text-neutral-300">
        <div className="font-semibold mb-1">We can get you this trip for the cheapest possible price.</div>
        <div className="text-neutral-400">Next: add your dates & preferences and we’ll hand-build your itinerary.</div>
        {continueError && (
          <div className="mt-3 text-sm text-red-400">
            {continueError}
          </div>
        )}
        <button
          className={`mt-3 w-full font-semibold text-sm py-3 rounded-xl transition-colors ${
            isContinuing
              ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600 text-neutral-900'
          }`}
          onClick={handleContinue}
          disabled={isContinuing}
        >
          {isContinuing ? 'Opening form…' : 'Continue →'}
        </button>
      </div>
    </section>
  );
}

function Fact({ label, value }) {
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
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
