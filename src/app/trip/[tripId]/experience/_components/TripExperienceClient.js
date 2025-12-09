'use client';

import { useEffect, useMemo, useState } from 'react';
import ItinerarySummary from '../../_components/ItinerarySummary';

export default function TripExperienceClient({
  destinationCountry,
  homeCountry,
  tripLengthDays,
  summaryCards,
  dayCards,
}) {
  const buildPlaceholderDays = (length) => {
    const count = Math.max(1, Number.isFinite(length) && length > 0 ? Math.round(length) : 1);
    return Array.from({ length: count }).map((_, idx) => ({
      id: `placeholder-day-${idx + 1}`,
      title: `Day ${idx + 1}`,
      fields: {},
      timeline: [],
    }));
  };

  const isDayCard = (card = {}, index) => {
    const type = typeof card.type === 'string' ? card.type.toLowerCase() : '';
    const id = card.id ? String(card.id).toLowerCase() : '';
    const title = typeof card.title === 'string' ? card.title : '';
    if (
      type === 'departure' ||
      type === 'return' ||
      type === 'flight' ||
      type === 'budget' ||
      type === 'summary' ||
      type === 'cost'
    ) {
      return false;
    }
    if (
      type === 'day' ||
      type === 'daily' ||
      type === 'day-card' ||
      type === 'itinerary-day' ||
      id.startsWith('day-') ||
      /^day\s*\d+/i.test(title)
    ) {
      return true;
    }
    if (Array.isArray(card.timeline) && card.timeline.length > 0) return true;
    if (card.fields?.city || card.fields?.dailyCost || card.fields?.highlightAttraction) return true;
    return false;
  };

  const tabDefinitions = useMemo(() => {
    const safeSummary = Array.isArray(summaryCards) ? summaryCards : [];
    const safeDaysSource = Array.isArray(dayCards) ? dayCards : safeSummary;
    const safeDays = safeDaysSource
      .map((card, idx) => ({ card, idx }))
      .filter(({ card, idx }) => isDayCard(card, idx))
      .map(({ card }) => card);
    const daysToRender = safeDays.length > 0 ? safeDays : buildPlaceholderDays(tripLengthDays);
    const isFlightCard = (card) => {
      const type = typeof card?.type === 'string' ? card.type.toLowerCase() : '';
      return type === 'departure' || type === 'return' || type === 'flight';
    };
    const isBudgetCard = (card) => {
      const type = typeof card?.type === 'string' ? card.type.toLowerCase() : '';
      const id = typeof card?.id === 'string' ? card.id.toLowerCase() : '';
      const title = typeof card?.title === 'string' ? card.title.toLowerCase() : '';
      return (
        type === 'budget' ||
        id.includes('budget') ||
        title.includes('budget') ||
        type === 'cost' ||
        type === 'summary'
      );
    };
    const isAccommodationCard = (card) => {
      const type = typeof card?.type === 'string' ? card.type.toLowerCase() : '';
      const id = typeof card?.id === 'string' ? card.id.toLowerCase() : '';
      const title = typeof card?.title === 'string' ? card.title.toLowerCase() : '';
      return (
        type === 'accommodation' ||
        type === 'stay' ||
        id.includes('accommodation') ||
        title.includes('accommodation') ||
        title.includes('hotel')
      );
    };
    const looksLikeFlight = (card) => {
      const title = typeof card?.title === 'string' ? card.title.toLowerCase() : '';
      return (
        isFlightCard(card) ||
        title.includes('flight') ||
        title.includes('departure') ||
        title.includes('return') ||
        title.includes('outbound') ||
        title.includes('inbound')
      );
    };
    const tabs = [
      {
        id: 'flights',
        label: 'Flights',
        content: (
          <ItinerarySummary
            cards={safeSummary.filter((card) => looksLikeFlight(card) && !isBudgetCard(card))}
            title="Flights"
            description="Your outbound and return routes."
          />
        ),
      },
      {
        id: 'accommodation',
        label: 'Accommodation',
        content: (
          <ItinerarySummary
            cards={safeSummary.filter((card) => isAccommodationCard(card) && !isBudgetCard(card))}
            title="Accommodation"
            description="Where you're staying each night."
          />
        ),
      },
      {
        id: 'summary',
        label: 'Summary',
        content: (
          <ItinerarySummary
            cards={safeSummary.filter(
              (card) => !looksLikeFlight(card) && !isBudgetCard(card) && !isAccommodationCard(card)
            )}
            title="Trip summary"
            description="High-level overview of stays and daily highlights."
          />
        ),
      },
    ];

    daysToRender.forEach((card, index) => {
      tabs.push({
        id: card.id ?? `day-${index + 1}`,
        label: card.title ?? `Day ${index + 1}`,
        content: <DayItineraryDetail card={card} />,
      });
    });

    return tabs;
  }, [summaryCards, dayCards]);

  const [activeTab, setActiveTab] = useState(tabDefinitions[0]?.id);
  useEffect(() => {
    if (tabDefinitions.length === 0) return;
    setActiveTab((prev) => (tabDefinitions.some((t) => t.id === prev) ? prev : tabDefinitions[0].id));
  }, [tabDefinitions]);

  const activeContent = tabDefinitions.find((tab) => tab.id === activeTab);

  return (
    <div className="space-y-4">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[#4C5A6B]">
          {homeCountry} → {destinationCountry}
        </p>
        <h1 className="text-3xl font-semibold">Your {tripLengthDays}-day escape</h1>
        <p className="text-sm text-[#4C5A6B]">
          Swipe through the summary or deep dive into each day&apos;s plans.
        </p>
      </header>

      <TabBar
        tabs={tabDefinitions}
        activeTab={activeTab}
        onSelect={setActiveTab}
      />

      <div className="mt-6 bg-white/60 border border-orange-100 rounded-3xl p-4 min-h-[60vh]">
        {activeContent ? (
          <div className="overflow-y-auto max-h-full pr-1">
            {activeContent.content}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function TabBar({ tabs, activeTab, onSelect }) {
  if (!tabs.length) return null;
  return (
    <nav className="flex justify-center">
      <div className="inline-flex flex-wrap items-center gap-2 bg-white border border-orange-100 rounded-full px-3 py-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab.id === activeTab
                ? 'bg-orange-500 text-neutral-900 shadow-sm'
                : 'text-[#4C5A6B] hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function DayItineraryDetail({ card }) {
  const fields = card?.fields ?? {};
  const city = fields.city || card?.subtitle || 'Destination';
  const highlight = fields.highlightAttraction || card?.summary;
  const cost = fields.dailyCost || card?.priceLabel;
  const notes = card?.notes;
  const timeline = Array.isArray(card?.timeline) ? card.timeline : [];

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-b from-[#FFF4EB] via-white to-[#FFF9F4] border border-orange-100 rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#4C5A6B]">
              City
            </p>
            <p className="text-lg font-semibold">{city}</p>
          </div>
          {cost ? (
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-[#4C5A6B]">
                Est. spend
              </p>
              <p className="text-lg font-semibold">{cost}</p>
            </div>
          ) : null}
        </div>
        {highlight ? (
          <p className="text-sm text-[#4C5A6B]">
            {highlight}
          </p>
        ) : (
          <p className="text-sm text-[#4C5A6B]">
            Add a headline highlight from the day planner.
          </p>
        )}
      </div>

      <div className="bg-gradient-to-b from-[#FFF4EB] via-white to-[#FFF9F4] border border-orange-100 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold">Detailed itinerary</h3>
        {timeline.length === 0 ? (
          <p className="text-sm text-[#4C5A6B]">
            Detailed plans will appear here once your travel specialist completes this day.
          </p>
        ) : (
          <div className="space-y-3">
            {timeline.map((entry, index) => (
              <TimelineEntry
                key={entry.id ?? index}
                entry={entry}
                isLast={index === timeline.length - 1}
              />
            ))}
          </div>
        )}
        {notes ? (
          <p className="text-sm text-[#4C5A6B]">Notes: {notes}</p>
        ) : (
          <p className="text-xs text-[#4C5A6B]">
            Add planning notes to the card to display them here.
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center text-sm text-[#4C5A6B]">
      No itinerary details to show yet.
    </div>
  );
}

const ENTRY_META = {
  attraction: {
    label: 'Attraction',
    border: 'border-purple-100',
    badge: 'bg-purple-100 text-purple-700',
    iconBg: 'bg-purple-50 border-purple-200 text-purple-700',
    rail: 'bg-purple-300',
  },
  photo: {
    label: 'Photo stop',
    border: 'border-rose-100',
    badge: 'bg-rose-100 text-rose-700',
    iconBg: 'bg-rose-50 border-rose-200 text-rose-700',
    rail: 'bg-rose-300',
  },
  rest: {
    label: 'Rest / sleep',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700',
    iconBg: 'bg-slate-50 border-slate-200 text-slate-700',
    rail: 'bg-slate-300',
  },
  food: {
    label: 'Food & drink',
    border: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-700',
    iconBg: 'bg-amber-50 border-amber-200 text-amber-700',
    rail: 'bg-amber-300',
  },
  accommodation: {
    label: 'Accommodation',
    border: 'border-emerald-100',
    badge: 'bg-emerald-100 text-emerald-700',
    iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    rail: 'bg-emerald-300',
  },
  flight: {
    label: 'Flight',
    border: 'border-sky-100',
    badge: 'bg-sky-100 text-sky-700',
    iconBg: 'bg-sky-50 border-sky-200 text-sky-700',
    rail: 'bg-sky-300',
  },
  transport: {
    label: 'Transport (train)',
    border: 'border-indigo-100',
    badge: 'bg-indigo-100 text-indigo-700',
    iconBg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    rail: 'bg-indigo-300',
  },
};

const DEFAULT_ENTRY_META = {
  label: 'Plan',
  border: 'border-slate-200',
  badge: 'bg-slate-100 text-slate-700',
  iconBg: 'bg-slate-50 border-slate-200 text-slate-700',
  rail: 'bg-slate-200',
};

const TRAVEL_META = {
  walk: { label: 'Walk', border: 'border-slate-200' },
  train: { label: 'Train', border: 'border-indigo-200' },
  tube: { label: 'Tube / metro', border: 'border-purple-200' },
  taxi: { label: 'Taxi', border: 'border-amber-200' },
  car: { label: 'Car / transfer', border: 'border-emerald-200' },
  flight: { label: 'Flight', border: 'border-sky-200' },
};

function TimelineEntry({ entry, isLast }) {
  const meta = ENTRY_META[entry?.type] ?? DEFAULT_ENTRY_META;
  const fields = entry?.fields ?? {};
  const title =
    typeof fields.title === 'string' && fields.title.trim()
      ? fields.title.trim()
      : meta.label;
  const time = typeof fields.time === 'string' ? fields.time.trim() : '';
  const rawBadge =
    typeof fields.price === 'string' && fields.price.trim()
      ? fields.price.trim()
      : typeof fields.tag === 'string' && fields.tag.trim()
      ? fields.tag.trim()
      : '';
  const isFree = rawBadge.toLowerCase() === 'free';
  const badgeClass = isFree
    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    : 'bg-slate-100 text-slate-900 border border-slate-200';
  const badge = rawBadge;
  const link = typeof fields.link === 'string' ? fields.link.trim() : '';
  const description = typeof fields.description === 'string' ? fields.description.trim() : '';
  const travelMode =
    typeof fields.travelMode === 'string' ? fields.travelMode.trim().toLowerCase() : '';
  const travelDuration =
    typeof fields.travelDuration === 'string' ? fields.travelDuration.trim() : '';
  const travelMeta = TRAVEL_META[travelMode] ?? null;
  const travelDurationLabel = formatDuration(travelDuration);

  return (
    <div className="relative flex flex-col pb-8">
      <article className={`relative overflow-hidden rounded-2xl border ${meta.border} bg-white shadow-sm`}>
        <div className={`absolute left-0 top-0 h-full w-1 ${meta.rail}`} />
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-start gap-4 min-w-0">
              <span className="text-sm font-semibold text-[#245ad4]">{time || '—'}</span>
              <div className="flex items-center gap-3">
                <span
                  className={`h-11 w-11 rounded-full border ${meta.iconBg} flex items-center justify-center`}
                >
                  <ExperienceIcon type={entry?.type} />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900 break-words">{title}</p>
                  {description ? (
                    <p className="text-sm text-[#4C5A6B] break-words">{description}</p>
                  ) : null}
                </div>
              </div>
            </div>
            {(badge || link) ? (
              <div className="flex flex-col items-end gap-3 min-w-[96px]">
                {badge ? (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
                  >
                    {badge}
                  </span>
                ) : null}
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-orange-500 text-orange-600 px-3 py-2 text-sm font-semibold hover:bg-orange-50 transition-colors"
                  >
                    Book now <ExternalIcon />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </article>
      {travelMode || travelDuration ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-[#4C5A6B]">
          <span
            className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 ${travelMeta?.border ?? 'border-slate-200'}`}
          >
            <TravelModeIcon mode={travelMode} />
            <span className="font-semibold text-slate-800">
              {travelMeta?.label ?? 'Travel'}
            </span>
            {travelDurationLabel ? <span className="text-[#4C5A6B]">• {travelDurationLabel}</span> : null}
          </span>
        </div>
      ) : null}
      {!isLast ? <span className="absolute left-5 right-5 bottom-2 h-px bg-slate-200" /> : null}
    </div>
  );
}

function ExperienceIcon({ type }) {
  const className = 'h-5 w-5';
  switch (type) {
    case 'attraction':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 3l8 4v2h-1.5l-1 10.5A1.5 1.5 0 0116 21H8a1.5 1.5 0 01-1.5-1.5L5.5 9H4V7l8-4zm0 2.2L9.6 6.5h4.8L12 5.2zM8 8.5l.9 10h6.2l.9-10H8z" />
        </svg>
      );
    case 'photo':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M4 6a2 2 0 012-2h2.172a2 2 0 001.414-.586l.828-.828A2 2 0 0111.828 2h.344a2 2 0 011.414.586l.828.828A2 2 0 0015.828 4H18a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm5 6a3 3 0 106 0 3 3 0 00-6 0z" />
        </svg>
      );
    case 'rest':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M3 5.5A1.5 1.5 0 014.5 4h6A1.5 1.5 0 0112 5.5V9h8a2 2 0 012 2v6h-2v-2H4v2H2V9a3.5 3.5 0 011-2.449V5.5zM4 11v2h16v-2H4z" />
        </svg>
      );
    case 'food':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M4 2h2v9a2 2 0 104 0V2h2v9a4 4 0 11-8 0V2zm12 0h2v8h2v12h-2v-6h-2V2z" />
        </svg>
      );
    case 'accommodation':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M3 11l9-7 9 7v10a1 1 0 01-1 1h-6v-6h-4v6H4a1 1 0 01-1-1V11z" />
        </svg>
      );
    case 'flight':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M2 13l1-2 8 1.5V5.5A1.5 1.5 0 0112.5 4 1.5 1.5 0 0114 5.5V12L21 13l1 2-8-1.5v4L16 19v1l-4-.5L8 20v-1l2-1.5v-4L2 13z" />
        </svg>
      );
    case 'transport':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M5 4a3 3 0 013-3h8a3 3 0 013 3v14a3 3 0 01-3 3l1.5 1.5V23h-2l-2-2h-3l-2 2H5.5v-.5L7 21a3 3 0 01-2-3V4zm2 6h10V4a1 1 0 00-1-1H8a1 1 0 00-1 1v6zm0 2v3a1 1 0 001 1h8a1 1 0 001-1v-3H7z" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2a5 5 0 015 5c0 2.5-1.5 4.5-3 6l-2 3-2-3c-1.5-1.5-3-3.5-3-6a5 5 0 015-5zm0 7a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      );
  }
}

function TravelModeIcon({ mode }) {
  const className = 'h-4 w-4';
  switch (mode) {
    case 'walk':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M13 5a2 2 0 10-2-2 2 2 0 002 2zM9 22l1-4-2.5-3.5L5 18v4H3v-6l3-4 2-4 2.5 1 1.5-2.5L15 7l2 1-3 5 2 2v7h-2v-5l-2-2-1 4-2 3H9z" />
        </svg>
      );
    case 'train':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M7 3a5 5 0 00-5 5v8a3 3 0 003 3L3 21v1h2l3-2h8l3 2h2v-1l-2-2a3 3 0 003-3V8a5 5 0 00-5-5H7zm0 2h10a3 3 0 013 3v5H4V8a3 3 0 013-3zm0 12a1 1 0 110-2 1 1 0 010 2zm10 0a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      );
    case 'tube':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M12 2a7 7 0 017 7v4a7 7 0 01-14 0V9a7 7 0 017-7zm-9 8h2v4H3v-4zm15 7l1.5 3h-2.2l-.8-1.5H7.5L6.7 20H4.5L6 17h12zm3-3h-2v-4h2v4z" />
        </svg>
      );
    case 'taxi':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M7 4l1-2h8l1 2h3a2 2 0 012 2v4l-2 8h-2a2 2 0 01-4 0H10a2 2 0 01-4 0H4L2 10V6a2 2 0 012-2h3zm-3 6h16V6H4v4zm3 6a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      );
    case 'car':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M4 11l1.5-4.5A2 2 0 017.4 5h9.2a2 2 0 011.9 1.5L20 11v7h-2a2 2 0 01-4 0H10a2 2 0 01-4 0H4v-7zm2.4-4l-.9 3h13l-.9-3H6.4zM7 17a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      );
    case 'flight':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
          <path d="M2 13l1-2 8 1.5V5.5A1.5 1.5 0 0112.5 4 1.5 1.5 0 0114 5.5V12L21 13l1 2-8-1.5v4L16 19v1l-4-.5L8 20v-1l2-1.5v-4L2 13z" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
  }
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm1 11h-3V7h2v4h1z" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M14 3h7v7h-2V6.414l-9.293 9.293-1.414-1.414L17.586 5H14V3z" />
      <path d="M5 5h5V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-5h-2v5H5V5z" />
    </svg>
  );
}

function formatDuration(raw) {
  if (!raw) return '';
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric >= 0) {
    if (numeric < 60) {
      return `${numeric} min`;
    }
    const hours = Math.floor(numeric / 60);
    const minutes = Math.round(numeric % 60);
    if (minutes === 0) {
      return `${hours} hr`;
    }
    return `${hours} hr ${minutes} min`;
  }
  const trimmed = raw.trim();
  return trimmed ? `${trimmed}${trimmed.toLowerCase().includes('min') ? '' : ' min'}` : '';
}
