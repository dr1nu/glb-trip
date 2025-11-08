'use client';

import { useMemo, useState } from 'react';
import ItinerarySummary from '../../_components/ItinerarySummary';

export default function TripExperienceClient({
  destinationCountry,
  homeCountry,
  tripLengthDays,
  summaryCards,
  dayCards,
}) {
  const tabDefinitions = useMemo(() => {
    const safeSummary = Array.isArray(summaryCards) ? summaryCards : [];
    const safeDays = Array.isArray(dayCards) ? dayCards : [];
    const tabs = [
      {
        id: 'summary',
        label: 'Summary',
        content: (
          <ItinerarySummary
            cards={safeSummary}
            title="Trip summary"
            description="High-level overview of flights, stays, and daily costs."
          />
        ),
      },
    ];

    safeDays.forEach((card, index) => {
      tabs.push({
        id: card.id ?? `day-${index + 1}`,
        label: card.title ?? `Day ${index + 1}`,
        content: <DayItineraryDetail card={card} />,
      });
    });

    return tabs;
  }, [summaryCards, dayCards]);

  const [activeTab, setActiveTab] = useState(tabDefinitions[0]?.id);
  const activeContent = tabDefinitions.find((tab) => tab.id === activeTab);

  return (
    <div className="relative pb-28">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
          {homeCountry} → {destinationCountry}
        </p>
        <h1 className="text-3xl font-semibold">Your {tripLengthDays}-day escape</h1>
        <p className="text-sm text-neutral-400">
          Swipe through the summary or deep dive into each day&apos;s plans.
        </p>
      </header>

      <div className="mt-6 bg-neutral-900/60 border border-neutral-800 rounded-3xl p-4 min-h-[60vh]">
        {activeContent ? (
          <div className="overflow-y-auto max-h-full pr-1">
            {activeContent.content}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      <TabBar
        tabs={tabDefinitions}
        activeTab={activeTab}
        onSelect={setActiveTab}
      />
    </div>
  );
}

function TabBar({ tabs, activeTab, onSelect }) {
  if (!tabs.length) return null;
  return (
    <nav className="fixed bottom-6 left-0 right-0 flex justify-center px-4">
      <div className="inline-flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 rounded-full px-3 py-2 shadow-2xl backdrop-blur">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab.id === activeTab
                ? 'bg-orange-500 text-neutral-900'
                : 'text-neutral-400 hover:text-neutral-100'
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
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              City
            </p>
            <p className="text-lg font-semibold">{city}</p>
          </div>
          {cost ? (
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                Est. spend
              </p>
              <p className="text-lg font-semibold">{cost}</p>
            </div>
          ) : null}
        </div>
        {highlight ? (
          <p className="text-sm text-neutral-300">
            {highlight}
          </p>
        ) : (
          <p className="text-sm text-neutral-500">
            Add a headline highlight from the day planner.
          </p>
        )}
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold">Detailed itinerary</h3>
        {timeline.length === 0 ? (
          <p className="text-sm text-neutral-500">
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
          <p className="text-sm text-neutral-300">Notes: {notes}</p>
        ) : (
          <p className="text-xs text-neutral-500">
            Add planning notes to the card to display them here.
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center text-sm text-neutral-500">
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
    iconColor: 'bg-neutral-800 border-neutral-700 text-neutral-300',
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
    <article className="border border-neutral-800 rounded-2xl p-4 space-y-3">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`h-11 w-11 rounded-full border ${meta.iconColor} flex items-center justify-center`}
          >
            <ExperienceIcon type={entry?.type} />
          </span>
          <div>
            <p className="text-base font-semibold text-neutral-100">{title}</p>
            {name && entry?.type === 'food' ? (
              <p className="text-sm text-neutral-400">{name}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 text-sm">
          {time ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-700 px-3 py-1 text-neutral-200">
              <ClockIcon /> {time}
            </span>
          ) : null}
          {price ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-700 px-3 py-1 text-neutral-200">
              <TagIcon /> {price}
            </span>
          ) : null}
        </div>
      </header>
      <div className="text-sm text-neutral-300 space-y-2">
        {description ? (
          <p>{description}</p>
        ) : (
          <p className="text-neutral-500 text-xs">
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
