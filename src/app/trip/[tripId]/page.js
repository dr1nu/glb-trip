import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTrip } from '@/lib/db';
import { COUNTRY_HUBS } from '@/lib/airfare';
import CreateItineraryButton from './_components/CreateItineraryButton';
import ItinerarySummary from './_components/ItinerarySummary';
import TripImagePicker from './_components/TripImagePicker';
import AdminBillingEditor from './_components/AdminBillingEditor';
import PayToUnlockButton from './_components/PayToUnlockButton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function euro(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `€${Math.round(value)}`;
}

function formatEuroCents(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  const rounded = Math.round(value);
  if (rounded % 100 === 0) {
    return `€${rounded / 100}`;
  }
  return `€${(rounded / 100).toFixed(2)}`;
}

export default async function TripPage({ params, searchParams }) {
  const { tripId } = await params;
  const query = (await searchParams) ?? {};
  const fromAdmin = query.from === 'admin';
  const trip = await getTrip(tripId);
  if (!trip) {
    notFound();
  }

  const {
    id,
    createdAt,
    destinationCountry,
    homeCountry,
    tripLengthDays,
    budgetTotal,
    result = {},
    contact = null,
    itinerary = null,
    preferences = null,
    imagePath = null,
    published = false,
    billingStatus = null,
    billingCurrency = 'EUR',
    billingAmountCents = null,
    billingCustomAmountCents = null,
    billingPaidAt = null,
  } = trip;

  const createdLabel = createdAt
    ? new Date(createdAt).toLocaleString()
    : 'unknown';

  const itineraryReady = Boolean(itinerary?.cards?.length) && (fromAdmin || published);
  const immersiveHref = fromAdmin
    ? `/trip/${id}/experience?from=admin`
    : `/trip/${id}/experience`;
  const showTravellerCTA = itineraryReady && !fromAdmin;
  const showAdminCTA = itineraryReady && fromAdmin;
  const effectiveAmountCents =
    typeof billingCustomAmountCents === 'number'
      ? billingCustomAmountCents
      : typeof billingAmountCents === 'number'
        ? billingAmountCents
        : Math.max(0, Math.round((tripLengthDays ?? 0) * 300));
  const paymentRequired = itineraryReady && !fromAdmin && billingStatus === 'pending';
  const travellers = formatTravellerCount(contact);
  const budgetLabel = formatBudgetLabel(budgetTotal);
  const travelDates = formatTravelDates(preferences);
  const durationLabel = formatDuration(tripLengthDays, preferences);
  const submissionLabel = formatSubmissionDate(createdAt);
  const interests = Array.isArray(preferences?.interests)
    ? preferences.interests
    : [];
  const travelWindowLabel = formatTravelWindow(preferences);
  const accommodationLabel = formatAccommodation(preferences);
  const baggageLabel = formatBaggage(preferences);

  if (itineraryReady && !fromAdmin && !paymentRequired) {
    redirect(immersiveHref);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fff7ef] via-white to-[#fff8f0] text-slate-900 px-4 py-6 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">
        <Link
          href={fromAdmin ? '/admin' : '/'}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition hover:-translate-y-[1px] hover:border-orange-200 hover:text-[#C2461E]"
        >
          <span aria-hidden>
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M13.5 8.5L10 12l3.5 3.5" />
              <path d="M10.5 12h6" />
            </svg>
          </span>
          {fromAdmin ? 'Back to admin' : 'Plan another trip'}
        </Link>

        {!itineraryReady ? (
          <PendingTripOverview
            destinationCountry={destinationCountry}
            submissionLabel={submissionLabel}
            travelDates={travelDates}
            durationLabel={durationLabel}
            travellers={travellers}
            budgetLabel={budgetLabel}
            homeCountry={homeCountry}
            preferences={preferences}
            contact={contact}
            travelWindowLabel={travelWindowLabel}
            accommodationLabel={accommodationLabel}
            baggageLabel={baggageLabel}
            interests={interests}
            fromAdmin={fromAdmin}
            paymentRequired={paymentRequired}
            effectiveAmountCents={effectiveAmountCents}
            billingCurrency={billingCurrency}
            tripId={id}
          />
        ) : (
          <ConfirmedTripOverview
            destinationCountry={destinationCountry}
            createdLabel={createdLabel}
            homeCountry={homeCountry}
            tripLengthDays={tripLengthDays}
            budgetLabel={budgetLabel}
            itinerary={itinerary}
            immersiveHref={immersiveHref}
            showTravellerCTA={showTravellerCTA}
            showAdminCTA={showAdminCTA}
            fromAdmin={fromAdmin}
            travellers={travellers}
            preferences={preferences}
            contact={contact}
            billingStatus={billingStatus}
            billingCurrency={billingCurrency}
            billingAmountCents={billingAmountCents}
            billingCustomAmountCents={billingCustomAmountCents}
            billingPaidAt={billingPaidAt}
            effectiveAmountCents={effectiveAmountCents}
            paymentRequired={paymentRequired}
            tripId={id}
          />
        )}

        {fromAdmin ? (
          <AdminActions
            tripId={id}
            destinationCountry={destinationCountry}
            homeCountry={homeCountry}
            imagePath={imagePath ?? ''}
            itineraryReady={itineraryReady}
            cardCount={itinerary?.cards?.length ?? 0}
            preferences={preferences}
            contact={contact}
            result={result}
            tripLengthDays={tripLengthDays}
            billingCurrency={billingCurrency}
            billingAmountCents={billingAmountCents}
            billingCustomAmountCents={billingCustomAmountCents}
          />
        ) : null}
      </div>
    </main>
  );
}

function PendingTripOverview({
  destinationCountry,
  submissionLabel,
  travelDates,
  durationLabel,
  travellers,
  budgetLabel,
  homeCountry,
  preferences,
  contact,
  travelWindowLabel,
  accommodationLabel,
  baggageLabel,
  interests,
  fromAdmin,
  paymentRequired,
  effectiveAmountCents,
  billingCurrency,
  tripId,
}) {
  const nearestAirport = contact?.nearestAirport || 'To be confirmed';
  const travellerName =
    contact?.name ||
    [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') ||
    'Traveller details pending';
  const showPaymentNotice = paymentRequired && !fromAdmin;
  const amountLabel = formatEuroCents(effectiveAmountCents);
  const billingContext =
    billingCurrency && billingCurrency !== 'EUR' ? ` (${billingCurrency})` : '';

  return (
    <>
      {showPaymentNotice ? (
        <section className="rounded-3xl border border-[#ffd9b3] bg-[#fff7ef] p-5 sm:p-6 space-y-4 shadow-sm shadow-[#ff8a00]/10">
          <SectionHeading
            title="Payment required to view your itinerary"
            description="Your trip is ready, but payment is needed before we can show the full details."
          />
          <div className="rounded-2xl border border-[#ffd9b3] bg-white/90 p-4 space-y-2 text-sm text-[#4C5A6B]">
            <p className="text-base font-semibold text-slate-900">
              Total due: {amountLabel}{billingContext}
            </p>
            <p className="text-xs text-[#6a7687]">
              You will be redirected to Stripe to complete payment securely.
            </p>
          </div>
          <PayToUnlockButton tripId={tripId} />
        </section>
      ) : null}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#ff9f43] via-[#ff8a00] to-[#ff6f00] text-white shadow-lg shadow-[#ff7a00]/20 border border-[#ffd9b3]">
        <div className="px-5 py-6 sm:px-7 sm:py-7 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase border border-white/30 shadow-sm shadow-black/10 text-white">
            <StatusDot />
            Pending review
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Your trip request</h1>
            <p className="text-sm text-white/80">
              Our travel specialists are crafting your personalised itinerary. Expect an update
              within 24–48 hours.
            </p>
          </div>
          <p className="text-xs text-white/75">Submitted on {submissionLabel}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-[#d8deed] bg-white/85 backdrop-blur-sm shadow-sm shadow-[#0c2a52]/5 p-5 sm:p-6 space-y-4">
        <SectionHeading
          title="Trip details"
          description="A quick snapshot of what you requested."
          accentClass="text-[#e56700] font-bold"
        />
        <div className="space-y-4">
          <InfoCard
            title="Destination"
            value={destinationCountry || 'To be decided'}
            icon={<IconCircle tone="blue"><PinIcon /></IconCircle>}
          />
          <div className="grid grid-cols-1 gap-4">
            <InfoCard
              title="Travel dates"
              value={travelDates}
              icon={<IconCircle tone="blue"><CalendarIcon /></IconCircle>}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard
              title="Home base"
              value={homeCountry || 'To be confirmed'}
              icon={<IconCircle tone="mint"><HomeIcon /></IconCircle>}
            />
            <InfoCard
              title="Nearest airport"
              value={nearestAirport || 'Not provided'}
              icon={<IconCircle tone="blue"><PlaneIcon /></IconCircle>}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard
              title="Travellers"
              value={travellers}
              icon={<IconCircle tone="blue"><UsersIcon /></IconCircle>}
            />
            <InfoCard
              title="Your budget"
              value={budgetLabel}
              icon={<IconCircle tone="gold"><WalletIcon /></IconCircle>}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#d8deed] bg-white/85 backdrop-blur-sm shadow-sm shadow-[#0c2a52]/5 p-5 sm:p-6 space-y-4">
        <SectionHeading
          title="Preferences"
          description="Captured so we can tailor the itinerary."
          accentClass="text-[#e56700] font-bold"
        />
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard
              title="Luggage"
              value={baggageLabel}
              icon={<IconCircle tone="blue"><PlaneIcon /></IconCircle>}
            />
            <InfoCard
              title="Accommodation"
              value={accommodationLabel}
              icon={<IconCircle tone="mint"><BedIcon /></IconCircle>}
            />
          </div>
          <InfoCard
            title="Travel interests"
            value={
              interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {interests.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#d8deed] bg-[#eef2fb] px-3 py-1 text-xs font-semibold text-[#0c2a52]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                'No interests selected'
              )
            }
            icon={<IconCircle tone="peach"><HeartIcon /></IconCircle>}
          />
          <InfoCard
            title="Notes"
            value={
              preferences?.details?.trim() || contact?.details?.trim() || 'No special requests.'
            }
            icon={<IconCircle tone="blue"><NoteIcon /></IconCircle>}
          />
          <InfoCard
            title="Contact"
            value={
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-900">{travellerName}</p>
                <p className="text-[13px] text-[#4C5A6B]">
                  {contact?.email || 'Email will be used for updates'}
                </p>
              </div>
            }
            meta={contact?.homeCountry || homeCountry || 'Home country not provided'}
            icon={<IconCircle tone="blue"><ContactIcon /></IconCircle>}
          />
        </div>
      </section>
    </>
  );
}

function ConfirmedTripOverview({
  destinationCountry,
  createdLabel,
  homeCountry,
  tripLengthDays,
  budgetLabel,
  itinerary,
  immersiveHref,
  showTravellerCTA,
  showAdminCTA,
  fromAdmin,
  travellers,
  preferences,
  contact,
  billingStatus,
  billingCurrency,
  billingAmountCents,
  billingCustomAmountCents,
  billingPaidAt,
  effectiveAmountCents,
  paymentRequired,
  tripId,
}) {
  const showPaymentNotice = paymentRequired && !fromAdmin;
  const amountLabel = formatEuroCents(effectiveAmountCents);
  const billingContext =
    billingCurrency && billingCurrency !== 'EUR' ? ` (${billingCurrency})` : '';
  const paidLabel = billingPaidAt
    ? new Date(billingPaidAt).toLocaleString()
    : null;

  return (
    <>
      <section
        className={`rounded-3xl border ${
          showPaymentNotice ? 'border-[#ffd9b3] bg-[#fff7ef]' : 'border-[#d8deed] bg-white/92'
        } shadow-sm ${showPaymentNotice ? 'shadow-[#ff8a00]/10' : 'shadow-[#0c2a52]/10'} p-5 sm:p-6 space-y-4`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0c2a52]">
              Trip confirmed
            </p>
            <h1 className="text-2xl font-semibold">
              Trip to {destinationCountry || 'Destination pending'}
            </h1>
            {showPaymentNotice ? (
              <p className="text-sm font-semibold text-[#c25a00]">
                Payment required to view your itinerary
              </p>
            ) : null}
            {!paymentRequired ? (
              <p className="text-sm text-[#4C5A6B]">Itinerary created {createdLabel}</p>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#eef2fb] px-3 py-1 text-xs font-semibold text-[#0c2a52] border border-[#d8deed]">
            <CheckIcon />
            Itinerary ready
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <Fact label="Destination" value={destinationCountry || 'To be confirmed'} />
          <Fact label="Home base" value={homeCountry || 'To be confirmed'} />
          <Fact
            label="Trip length"
            value={
              tripLengthDays
                ? `${tripLengthDays} day${tripLengthDays === 1 ? '' : 's'}`
                : 'Length not set'
            }
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Fact label="Budget" value={budgetLabel} />
          <Fact label="Travellers" value={travellers} />
        </div>
        {billingStatus && !paymentRequired ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Fact
              label="Billing"
              value={
                billingStatus === 'paid'
                  ? `Paid${paidLabel ? ` on ${paidLabel}` : ''}`
                  : billingStatus === 'free'
                    ? 'Included (free annual trip)'
                    : 'Payment required'
              }
            />
            <Fact
              label="Amount"
              value={billingStatus === 'free' ? '€0' : `${amountLabel}${billingContext}`}
            />
          </div>
        ) : null}

        {showPaymentNotice ? (
          <div className="mt-2 rounded-2xl border border-[#ffd9b3] bg-white/90 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base font-semibold text-slate-900">
                Total due: {amountLabel}{billingContext}
              </p>
              <PayToUnlockButton tripId={tripId} />
            </div>
          </div>
        ) : null}
      </section>

      {showPaymentNotice ? (
          <section className="relative rounded-3xl border border-[#ffd9b3] bg-[#fff7ef] shadow-sm shadow-[#ff8a00]/10 overflow-hidden">
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
              <div className="rounded-2xl border border-[#ff8a00] bg-white px-6 py-5 shadow-xl shadow-[#ff8a00]/30">
                <p className="text-base font-semibold text-slate-900">
                  Unlock your full itinerary
                </p>
                <p className="text-sm text-[#4C5A6B]">
                  Pay to view every day, detail, and booking link.
                </p>
                <div className="mt-3">
                  <PayToUnlockButton tripId={tripId} label="Pay to unlock itinerary" />
                </div>
              </div>
            </div>
            <div className="pointer-events-none z-0 blur-[2px] opacity-60">
              <ItinerarySummary
                className="border-0 bg-transparent p-5 sm:p-6 shadow-none"
                cards={itinerary?.cards || []}
                title="Your itinerary"
                description="Jump straight into the plan we created for you."
                preferences={preferences}
              />
            </div>
          </section>
      ) : (
        <ItinerarySummary
          className="shadow-sm shadow-[#0c2a52]/10 border border-[#ffd9b3] bg-[#fff7ef]"
          cards={itinerary?.cards || []}
          title="Your itinerary"
          description="Jump straight into the plan we created for you."
          preferences={preferences}
        />
      )}

      {showTravellerCTA && !showPaymentNotice ? (
        <section className="rounded-2xl border border-[#ffd9b3] bg-[#fff7ef] p-5 space-y-3 shadow-sm shadow-[#ff8a00]/10">
          <div>
            <h2 className="text-lg font-semibold">Ready to explore?</h2>
            <p className="text-sm text-[#4C5A6B]">
              Open the immersive view to see day-by-day highlights, links, and timings.
            </p>
          </div>
          <Link
            href={immersiveHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff8a00] px-4 py-2 text-sm font-semibold text-white shadow shadow-[#ff8a00]/30 transition hover:bg-[#ff7a00]"
          >
            View my itinerary
          </Link>
        </section>
      ) : null}

      {showAdminCTA ? (
        <div className="text-right">
          <Link
            href={immersiveHref}
            className="text-sm font-semibold text-[#0c2a52] hover:text-[#0a2344]"
          >
            Open immersive view →
          </Link>
        </div>
      ) : null}

      {!paymentRequired && (contact || preferences) ? (
        <section className="rounded-3xl border border-[#ffd9b3] bg-[#fff7ef] p-5 sm:p-6 space-y-4 shadow-sm shadow-[#ff8a00]/10">
          <SectionHeading
            title="Traveller details"
            description="Captured when the request was submitted."
          />
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Detail
              label="Name"
              value={
                contact?.name ||
                [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') ||
                '—'
              }
            />
            <Detail label="Email" value={contact?.email || '—'} />
            <Detail
              label="Home country"
              value={contact?.homeCountry || contact?.city || '—'}
            />
            <Detail
              label="Nearest airport"
              value={contact?.nearestAirport || '—'}
            />
            <Detail label="Travel window" value={formatTravelWindow(preferences)} />
            <Detail label="Accommodation" value={formatAccommodation(preferences)} />
            <Detail
              label="Interests"
              value={
                Array.isArray(preferences?.interests) && preferences.interests.length > 0
                  ? preferences.interests.join(', ')
                  : '—'
              }
            />
            <Detail
              label="Special requests"
              value={preferences?.details || contact?.details || '—'}
              className="sm:col-span-2"
            />
          </dl>
        </section>
      ) : null}
    </>
  );
}

function AdminActions({
  tripId,
  destinationCountry,
  homeCountry,
  imagePath,
  itineraryReady,
  cardCount,
  preferences,
  contact,
  result,
  tripLengthDays,
  billingCurrency,
  billingAmountCents,
  billingCustomAmountCents,
}) {
  if (!tripId) return null;
  const { flightsUrl, accommodationUrl } = buildQuickSearchLinks({
    homeCountry,
    destinationCountry,
    preferences,
    contact,
    result,
  });
  return (
    <section className="rounded-3xl border border-[#ffd9b3] bg-[#fff7ef] p-5 sm:p-6 space-y-4 shadow-sm shadow-[#ff8a00]/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Admin</p>
          <p className="text-xs text-[#4C5A6B]">
            Build or refine the itinerary and set the trip cover image.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold border ${
            itineraryReady
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-[#fff3e5] border-[#ffd9b3] text-[#c25a00]'
          }`}
        >
          {itineraryReady ? 'Itinerary created' : 'Pending build'}
        </span>
      </div>

      <div className="rounded-xl border border-[#ffd9b3] bg-white/80 p-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#c25a00]">
          Quick search
        </span>
        {flightsUrl ? (
          <a
            href={flightsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff9f43] via-[#ff8a00] to-[#ff6f00] px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-[#ff8a00]/30 hover:brightness-105 transition"
          >
            ✈ Search flights
          </a>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-[#f3e5d8] px-4 py-2 text-xs font-semibold text-[#a07955] cursor-not-allowed"
            title="Add valid airports and dates to enable flight search"
            disabled
          >
            ✈ Search flights
          </button>
        )}
        {accommodationUrl ? (
          <a
            href={accommodationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#0c2a52] px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-[#0c2a52]/20 hover:bg-[#0a2344] transition"
          >
            🏨 Search accommodation
          </a>
        ) : null}
      </div>

      <CreateItineraryButton
        tripId={tripId}
        hasItinerary={itineraryReady}
        cardCount={cardCount}
      />

      <AdminBillingEditor
        tripId={tripId}
        tripLengthDays={tripLengthDays}
        billingCurrency={billingCurrency}
        billingAmountCents={billingAmountCents}
        billingCustomAmountCents={billingCustomAmountCents}
      />

      <TripImagePicker
        tripId={tripId}
        destinationCountry={destinationCountry}
        initialImagePath={imagePath}
      />
    </section>
  );
}

function SectionHeading({ title, description, accentClass = '' }) {
  return (
    <header className="space-y-1">
      <h2 className={`text-lg font-semibold ${accentClass}`}>{title}</h2>
      <p className="text-sm text-[#42526b]">{description}</p>
    </header>
  );
}

function InfoCard({ title, value, meta, icon }) {
  return (
    <article className="rounded-2xl border border-[#d8deed] bg-[#f8faff] p-4 sm:p-5 shadow-sm shadow-[#0c2a52]/5">
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0c2a52]">
            {title}
          </p>
          <div className="text-sm sm:text-base font-semibold text-slate-900">
            {typeof value === 'string' || typeof value === 'number' ? (
              <span>{value}</span>
            ) : (
              value
            )}
          </div>
          {meta ? <p className="text-xs text-[#42526b]">{meta}</p> : null}
        </div>
      </div>
    </article>
  );
}

function Fact({ label, value }) {
  return (
    <div className="rounded-xl border border-[#d8deed] bg-[#eef2fb] p-3 space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-[#0c2a52]">
        {label}
      </div>
      <div className="text-sm font-semibold">{value ?? '—'}</div>
    </div>
  );
}

function Detail({ label, value, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-[#d8deed] bg-[#eef2fb] p-3 space-y-1 ${className}`}
    >
      <div className="text-[11px] uppercase tracking-wide text-[#0c2a52]">
        {label}
      </div>
      <div className="text-sm font-medium break-words text-slate-900">
        {value ?? '—'}
      </div>
    </div>
  );
}

function formatBaggage(preferences) {
  const map = {
    small: 'Small bag only',
    cabin: 'Cabin bag',
    checked: 'Checked bag',
  };
  return map[preferences?.baggage] ?? '—';
}

function formatFlexibleMonthLabel(preferences) {
  if (!preferences?.flexibleMonth) return '';
  const parsed = new Date(`${preferences.flexibleMonth}-01`);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    year: '2-digit',
  }).format(parsed);
}

function formatTravelWindow(preferences) {
  if (!preferences) return '—';
  if (preferences.travelWindow === 'flexible') {
    const flexibleLabel = formatFlexibleMonthLabel(preferences);
    const days =
      Number(preferences.flexibleDays) ||
      Number(preferences.rangeDays) ||
      0;
    const daysLabel = days > 0 ? `${days} days` : 'Flexible days';
    return flexibleLabel ? `${daysLabel} during ${flexibleLabel}` : daysLabel;
  }
  if (preferences.travelWindow === 'range' || preferences.travelWindow === 'specific') {
    const from = preferences.dateFrom || 'TBC';
    const to = preferences.dateTo || 'TBC';
    return `${from} → ${to}`;
  }
  return '—';
}

function formatAccommodation(preferences) {
  const map = {
    budget: 'Budget hotel',
    'b&b': 'Bed & breakfast',
    luxury: 'Luxury hotel',
    flat: 'Flat',
    airbnb: 'Airbnb',
    none: 'No preference',
    hotel: 'Hotel',
  };
  return map[preferences?.accommodation] ?? '—';
}

function formatTravellerCount(contact) {
  if (!contact) return 'Traveller details pending';
  const adults = typeof contact.adults === 'number' ? contact.adults : null;
  const children = typeof contact.children === 'number' ? contact.children : 0;
  if (adults === null) return 'Traveller details pending';
  const adultLabel = `${adults} adult${adults === 1 ? '' : 's'}`;
  const childLabel =
    children > 0 ? ` · ${children} child${children === 1 ? '' : 'ren'}` : '';
  return `${adultLabel}${childLabel}`;
}

function formatBudgetLabel(budgetTotal) {
  if (typeof budgetTotal === 'number' && !Number.isNaN(budgetTotal)) {
    return euro(budgetTotal);
  }
  return 'Budget not set';
}

function buildQuickSearchLinks({ homeCountry, destinationCountry, preferences, contact, result }) {
  const parseIata = (value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/\b([A-Z]{3})\b/);
    return match ? match[1] : null;
  };
  const formatSkyScannerDate = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${yy}${mm}${dd}`;
  };
  const formatBookingDate = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  };

  const homeHub = COUNTRY_HUBS[homeCountry] ?? {};
  const destHub = COUNTRY_HUBS[destinationCountry] ?? {};
  const originIata =
    parseIata(contact?.nearestAirport) ||
    parseIata(result?.flight?.from) ||
    parseIata(homeHub.iata);
  const destinationIata =
    parseIata(result?.flight?.to) ||
    parseIata(destHub.iata);

  const outbound = formatSkyScannerDate(preferences?.dateFrom);
  const inbound = formatSkyScannerDate(preferences?.dateTo);
  const flightsUrl =
    originIata && destinationIata && outbound && inbound
      ? `https://www.skyscanner.net/transport/flights/${originIata.toLowerCase()}/${destinationIata.toLowerCase()}/${outbound}/${inbound}/`
      : '';

  const checkin = formatBookingDate(preferences?.dateFrom);
  const checkout = formatBookingDate(preferences?.dateTo);
  const destinationLabel =
    (typeof result?.destinationLabel === 'string' && result.destinationLabel) ||
    destinationCountry ||
    '';
  const adults =
    Number.isFinite(contact?.adults) && contact.adults > 0 ? contact.adults : 2;
  const children =
    Number.isFinite(contact?.children) && contact.children >= 0 ? contact.children : 0;
  const accommodationUrl =
    destinationLabel && checkin && checkout
      ? `https://www.booking.com/searchresults.en-gb.html?ss=${encodeURIComponent(destinationLabel)}&checkin=${checkin}&checkout=${checkout}&group_adults=${adults}&group_children=${children}&no_rooms=1`
      : '';

  return { flightsUrl, accommodationUrl };
}

function formatTravelDates(preferences) {
  if (!preferences) return 'Dates not provided';
  const { travelWindow, dateFrom, dateTo, flexibleMonth, flexibleDays, rangeDays } = preferences;
  if (travelWindow === 'flexible' && flexibleMonth) {
    const parsed = new Date(`${flexibleMonth}-01`);
    if (!Number.isNaN(parsed.getTime())) {
      const days = Number(flexibleDays) || Number(rangeDays) || 0;
      const daysLabel = days > 0 ? `${days} days` : 'Flexible days';
      const monthLabel = new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        year: '2-digit',
      }).format(parsed);
      return `${daysLabel} during ${monthLabel}`;
    }
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
  if (travelWindow === 'specific' && dateFrom && dateTo) {
    const fromLabel = formatDateLabel(dateFrom);
    const toLabel = formatDateLabel(dateTo);
    return `${fromLabel} → ${toLabel}`;
  }
  if (dateFrom) return `From ${formatDateLabel(dateFrom)}`;
  return 'Dates not provided';
}

function formatNumericDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date)) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
}

function formatDuration(tripLengthDays, preferences) {
  if (tripLengthDays) {
    return `${tripLengthDays} day${tripLengthDays === 1 ? '' : 's'}`;
  }
  const { dateFrom, dateTo } = preferences || {};
  if (dateFrom && dateTo) {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    if (!Number.isNaN(start) && !Number.isNaN(end)) {
      const ms = end - start;
      if (ms > 0) {
        const days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
        return `${days} day${days === 1 ? '' : 's'}`;
      }
    }
  }
  return 'Duration to be confirmed';
}

function formatSubmissionDate(createdAt) {
  if (!createdAt) return 'date unknown';
  const date = new Date(createdAt);
  if (Number.isNaN(date)) return 'date unknown';
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date)) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function resultConfidence(preferences) {
  if (!preferences) return 'Waiting for a budget estimate';
  if (preferences.travelWindow === 'flexible') return 'Window: flexible';
  if (preferences.dateFrom && preferences.dateTo) return `Window: ${preferences.dateFrom} → ${preferences.dateTo}`;
  return 'Budget will be finalised after review';
}

function IconCircle({ children, tone = 'blue' }) {
  const palette = {
    bg: 'bg-[#e1eaff]',
    text: 'text-[#0f1f49]',
    border: 'border-[#a8baf5]',
  };

  return (
    <div className={`mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-full border ${palette.bg} ${palette.border} ${palette.text}`}>
      {children}
    </div>
  );
}

function StatusDot() {
  return <span className="h-2 w-2 rounded-full bg-[#ffe2b3] inline-block" aria-hidden />;
}

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C8.13 2 5 5.067 5 8.857 5 14.571 12 22 12 22s7-7.429 7-13.143C19 5.067 15.87 2 12 2zm0 9.714a2.857 2.857 0 110-5.714 2.857 2.857 0 010 5.714z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V9h14v9z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16 11c1.66 0 2.99-1.57 2.99-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11zm-8 0c1.66 0 2.99-1.57 2.99-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 7H5c-.55 0-1 .45-1 1v10c0 1.1.9 2 2 2h15c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1zm-2 7h-3v-2h3v2zm0-9H4c-.55 0-1 .45-1 1v12h2V6h14v1z" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 16.5v-1.764a1 1 0 00-.553-.894L13 10V5.5a1.5 1.5 0 00-3 0V10l-7.447 3.842A1 1 0 002 14.736V16.5l9-1.5v3.764l-2.553.894A1 1 0 008 21.5h2l1.333-.5L12.667 21.5H15a1 1 0 00.553-1.842L13 18.764V15l8 1.5z" />
    </svg>
  );
}

function BedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 10.5c0-.83-.67-1.5-1.5-1.5H13V6c0-.55-.45-1-1-1H4C2.9 5 2 5.9 2 7v10h2v-2h16v2h2v-6.5c0-.83-.67-1.5-1.5-1.5zM4 9V7h7v2H4zm0 4v-2h15.5c.28 0 .5.22.5.5V13H4z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21s-6.716-4.42-9.192-8.15C.204 10.287 1.228 6.13 4.82 5.246c1.916-.482 3.61.33 4.68 1.88C10.57 5.576 12.264 4.764 14.18 5.246c3.592.884 4.616 5.041 2.012 7.604C18.716 16.58 12 21 12 21z" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14l4-4h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 9H8v-2h8v2zm0-3H8V7h8v2z" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3l9 6v12a1 1 0 01-1 1h-6v-6h-4v6H4a1 1 0 01-1-1V9l9-6z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}
