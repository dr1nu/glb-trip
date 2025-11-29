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
              <TimelineEntry key={entry.id ?? index} entry={entry} index={index} />
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
  transport: {
    label: 'Transport',
    iconColor: 'bg-sky-500/10 border-sky-400/40 text-sky-200',
  },
  attraction: {
    label: 'Attraction',
    iconColor: 'bg-purple-500/10 border-purple-400/40 text-purple-200',
  },
  food: {
    label: 'Food & drink',
    iconColor: 'bg-emerald-500/10 border-emerald-400/40 text-emerald-200',
  },
};

function TimelineEntry({ entry, index }) {
  const meta = ENTRY_META[entry?.type] ?? {
    label: 'Plan',
    iconColor: 'bg-orange-50 border-orange-100 text-[#4C5A6B]',
  };
  const fields = entry?.fields ?? {};
  const title =
    typeof fields.title === 'string' && fields.title.trim()
      ? fields.title.trim()
      : meta.label;
  const time = fields.time;
  const price = fields.price;
  const link = fields.link;
  const description = fields.description;
  const name = fields.name;

  return (
    <article className="border border-orange-100 rounded-2xl p-4 space-y-3">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`h-11 w-11 rounded-full border ${meta.iconColor} flex items-center justify-center`}
          >
            <ExperienceIcon type={entry?.type} />
          </span>
          <div>
            <p className="text-base font-semibold text-slate-900">{title}</p>
            {name && entry?.type === 'food' ? (
              <p className="text-sm text-[#4C5A6B]">{name}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 text-sm">
          {time ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-orange-100 px-3 py-1 text-[#4C5A6B]">
              <ClockIcon /> {time}
            </span>
          ) : null}
          {price ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-orange-100 px-3 py-1 text-[#4C5A6B]">
              <TagIcon /> {price}
            </span>
          ) : null}
        </div>
      </header>
      <div className="text-sm text-[#4C5A6B] space-y-2">
        {description ? (
          <p>{description}</p>
        ) : (
          <p className="text-[#4C5A6B] text-xs">
            Details will be added soon.
          </p>
        )}
      </div>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-orange-400 transition-colors"
        >
          View details
        </a>
      ) : null}
    </article>
  );
}

function ExperienceIcon({ type }) {
  if (type === 'transport') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M4 16V6a4 4 0 014-4h8a4 4 0 014 4v10a4 4 0 01-4 4l2 1.5v.5h-2l-3-2h-2l-3 2H6v-.5L8 20a4 4 0 01-4-4zm2-5h12V6a2 2 0 00-2-2H8a2 2 0 00-2 2v5zm0 4a2 2 0 002 2h8a2 2 0 002-2v-1H6v1z" />
      </svg>
    );
  }
  if (type === 'attraction') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 3h3v18H4V3zm13.5 0a4.5 4.5 0 00-4.5 4.5v8.25a3.75 3.75 0 007.5 0V7.5A4.5 4.5 0 0017.5 3zm-3 4.5A3 3 0 0117.5 4.5 3 3 0 0120.5 7.5v8.25a2.25 2.25 0 11-4.5 0V7.5z" />
    </svg>
  );
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

function TagIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M20.59 13.41l-8-8A2 2 0 0011.17 5H5a2 2 0 00-2 2v6.17a2 2 0 00.59 1.41l8 8a2 2 0 002.82 0l6.18-6.18a2 2 0 000-2.82zM7.5 9A1.5 1.5 0 119 10.5 1.5 1.5 0 017.5 9z" />
    </svg>
  );
}
