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
            {meta.label.charAt(0)}
          </span>
          <div>
            <p className="text-sm font-semibold">{meta.label}</p>
            <p className="text-xs text-neutral-500">Stop {index + 1}</p>
          </div>
        </div>
        <div className="text-right text-xs text-neutral-400 space-y-1">
          {time ? <p>Time · {time}</p> : null}
          {price ? <p>Price · {price}</p> : null}
        </div>
      </header>
      <div className="text-sm text-neutral-300 space-y-2">
        {entry.type === 'food' && name ? (
          <p className="font-semibold text-neutral-100">{name}</p>
        ) : null}
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
