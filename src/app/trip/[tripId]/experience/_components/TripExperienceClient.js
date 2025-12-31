'use client';

import { useEffect, useMemo, useState } from 'react';
import ItinerarySummary from '../../_components/ItinerarySummary';

export default function TripExperienceClient({
  destinationCountry,
  homeCountry,
  tripLengthDays,
  summaryCards,
  dayCards,
  otherActivities = [],
  preferences = null,
}) {
  const [usefulPosts, setUsefulPosts] = useState([]);

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

  useEffect(() => {
    const baseUrl =
      typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WP_BASE_URL
        ? process.env.NEXT_PUBLIC_WP_BASE_URL
        : 'https://getlostonabudget.com';
    if (!destinationCountry) {
      setUsefulPosts([]);
      return;
    }
    const slug = slugifyCategory(destinationCountry);
    if (!slug) {
      setUsefulPosts([]);
      return;
    }

    let cancelled = false;
    const loadPosts = async () => {
      try {
        const categoryResponse = await fetch(
          `${baseUrl}/wp-json/wp/v2/categories?slug=${encodeURIComponent(slug)}`
        );
        if (!categoryResponse.ok) {
          throw new Error('Unable to load categories.');
        }
        const categoryPayload = await categoryResponse.json();
        const categoryId = Array.isArray(categoryPayload) ? categoryPayload[0]?.id : null;
        if (!categoryId) {
          if (!cancelled) setUsefulPosts([]);
          return;
        }

        const postsResponse = await fetch(
          `${baseUrl}/wp-json/wp/v2/posts?categories=${categoryId}&_embed&per_page=100`
        );
        if (!postsResponse.ok) {
          throw new Error('Unable to load posts.');
        }
        const postsPayload = await postsResponse.json();
        if (!cancelled) {
          setUsefulPosts(Array.isArray(postsPayload) ? postsPayload : []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load useful info posts', err);
          setUsefulPosts([]);
        }
      }
    };

    loadPosts();
    return () => {
      cancelled = true;
    };
  }, [destinationCountry]);

  const tabDefinitions = useMemo(() => {
    const safeSummary = Array.isArray(summaryCards) ? summaryCards : [];
    const safeDaysSource = Array.isArray(dayCards) ? dayCards : safeSummary;
    const safeOther = Array.isArray(otherActivities) ? otherActivities : [];
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
    const flightCards = safeSummary.filter((card) => looksLikeFlight(card) && !isBudgetCard(card));
    const accommodationCards = safeSummary.filter(
      (card) => isAccommodationCard(card) && !isBudgetCard(card)
    );

    const tabs = [
      {
        id: 'trip-details',
        label: 'Trip Details',
        content: (
          <div className="space-y-6">
            <ItinerarySummary
              cards={flightCards}
              title="Flights"
              description="Your outbound and return routes."
              preferences={preferences}
              showFlightDisclaimer
            />
            <ItinerarySummary
              cards={accommodationCards}
              title="Accommodation"
              description="Where you're staying each night."
              preferences={preferences}
              showAccommodationDisclaimer
            />
          </div>
        ),
      },
    ];
    if (usefulPosts.length > 0) {
      tabs.push({
        id: 'useful-info',
        label: 'Useful Info',
        content: <UsefulInfoGrid posts={usefulPosts} />,
      });
    }

    daysToRender.forEach((card, index) => {
      tabs.push({
        id: card.id ?? `day-${index + 1}`,
        label: card.title ?? `Day ${index + 1}`,
        content: <DayItineraryDetail card={card} />,
      });
    });

    if (safeOther.length > 0) {
      tabs.push({
        id: 'other-activities',
        label: 'Other Activities',
        content: <OtherActivitiesList activities={safeOther} />,
      });
    }

    return tabs;
  }, [
    summaryCards,
    dayCards,
    otherActivities,
    tripLengthDays,
    preferences,
    usefulPosts,
  ]);

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
      <div className="flex w-full justify-start overflow-x-auto sm:w-auto sm:justify-center sm:overflow-visible">
        <div className="inline-flex w-max items-center gap-2 bg-white border border-orange-100 rounded-full px-3 py-2 shadow-sm sm:w-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tab.id === activeTab
                  ? 'bg-orange-500 text-neutral-900 shadow-sm'
                  : 'text-[#4C5A6B] hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

function UsefulInfoGrid({ posts }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {posts.map((post) => (
        <UsefulPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function UsefulPostCard({ post }) {
  const title = stripHtml(post?.title?.rendered || 'Untitled');
  const excerptHtml = post?.excerpt?.rendered || '';
  const imageUrl = getFeaturedImage(post);
  const href = post?.link || '#';

  return (
    <article className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm shadow-orange-100/40">
      {imageUrl ? (
        <div className="h-44 w-full overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="p-4 space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {excerptHtml ? (
          <div
            className="text-sm text-[#4C5A6B] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: excerptHtml }}
          />
        ) : null}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
        >
          Read more
        </a>
      </div>
    </article>
  );
}

function getFeaturedImage(post) {
  const media = post?._embedded?.['wp:featuredmedia']?.[0];
  return media?.source_url || '';
}

function stripHtml(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').trim();
}

function slugifyCategory(value) {
  if (typeof value !== 'string') return '';
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
      <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm shadow-slate-100 space-y-3">
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

      <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm shadow-slate-100 space-y-4">
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

function OtherActivitiesList({ activities }) {
  if (!activities?.length) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#4C5A6B]">
        Ideas we like that aren&apos;t locked to a specific day. Use them as backups or spontaneous
        additions.
      </p>
      <div className="space-y-3">
        {activities.map((entry, index) => (
          <TimelineEntry
            key={entry.id ?? index}
            entry={entry}
            isLast={index === activities.length - 1}
          />
        ))}
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
    border: 'border-orange-100',
    badge: 'bg-orange-100 text-orange-700',
    iconBg: 'bg-orange-50 border-orange-200 text-orange-700',
    rail: 'bg-orange-300',
  },
  museum: {
    label: 'Museum',
    border: 'border-purple-100',
    badge: 'bg-purple-100 text-purple-700',
    iconBg: 'bg-purple-50 border-purple-200 text-purple-700',
    rail: 'bg-purple-300',
  },
  park: {
    label: 'Park',
    border: 'border-emerald-100',
    badge: 'bg-emerald-100 text-emerald-700',
    iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    rail: 'bg-emerald-300',
  },
  church: {
    label: 'Church',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700',
    iconBg: 'bg-slate-50 border-slate-200 text-slate-700',
    rail: 'bg-slate-300',
  },
  shopping: {
    label: 'Shopping',
    border: 'border-rose-100',
    badge: 'bg-rose-100 text-rose-700',
    iconBg: 'bg-rose-50 border-rose-200 text-rose-700',
    rail: 'bg-rose-300',
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
    label: 'Eat & drink',
    border: 'border-amber-100',
    badge: 'bg-amber-100 text-amber-700',
    iconBg: 'bg-amber-50 border-amber-200 text-amber-700',
    rail: 'bg-amber-300',
  },
  coffee: {
    label: 'Coffee',
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 min-w-0">
              <span className="text-sm font-semibold text-[#245ad4] sm:min-w-[64px] sm:text-center">
                {time || '—'}
              </span>
              <div className="flex items-center gap-3">
                <span
                  className={`h-12 w-12 rounded-full border ${meta.iconBg} flex items-center justify-center`}
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
              <div className="flex w-full flex-col items-start gap-3 text-left sm:w-auto sm:min-w-[96px] sm:items-center sm:text-center">
                {badge ? (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-center ${badgeClass}`}
                  >
                    {badge}
                  </span>
                ) : null}
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500 text-orange-600 px-3 py-2 text-sm font-semibold hover:bg-orange-50 transition-colors sm:w-auto"
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
  const className = 'h-6 w-6';
  const strokeProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (type) {
    case 'attraction':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M12 22s6-6.5 6-11a6 6 0 10-12 0c0 4.5 6 11 6 11z" />
          <circle cx="12" cy="11" r="2.5" />
        </svg>
      );
    case 'museum':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M3 10h18" />
          <path d="M4 21h16" />
          <path d="M5 10V8l7-4 7 4v2" />
          <path d="M7 10v9" />
          <path d="M10.5 10v9" />
          <path d="M13.5 10v9" />
          <path d="M17 10v9" />
        </svg>
      );
    case 'park':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <circle cx="12" cy="8" r="4" />
          <circle cx="8" cy="11" r="3" />
          <circle cx="16" cy="11" r="3" />
          <path d="M12 12v8" />
          <path d="M9 20h6" />
        </svg>
      );
    case 'church':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M12 3v4" />
          <path d="M10.5 5.5h3" />
          <path d="M6 21h12" />
          <path d="M7 21V10l5-4 5 4v11" />
          <path d="M10 21v-4h4v4" />
        </svg>
      );
    case 'shopping':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M6 9h12l-1 11H7L6 9z" />
          <path d="M9 9V7a3 3 0 016 0v2" />
          <path d="M8.5 12.5h.01" />
          <path d="M15.5 12.5h.01" />
        </svg>
      );
    case 'photo':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <path d="M8 7l1.5-2h5L16 7" />
          <circle cx="12" cy="13" r="3" />
          <circle cx="17" cy="10" r="1" />
        </svg>
      );
    case 'rest':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M3 12h18" />
          <path d="M5 12v6" />
          <path d="M19 12v6" />
          <path d="M7 12h9a3 3 0 013 3v3H7v-6z" />
          <path d="M7 9h5a2 2 0 012 2v1H7V9z" />
        </svg>
      );
    case 'food':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M5 3v8" />
          <path d="M3 3v4" />
          <path d="M7 3v4" />
          <path d="M5 11v10" />
          <path d="M13 3v18" />
          <path d="M17 3v7a2 2 0 01-2 2h-2" />
        </svg>
      );
    case 'coffee':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M5 7h9v6a4 4 0 01-4 4H9a4 4 0 01-4-4V7z" />
          <path d="M14 8h2a3 3 0 010 6h-2" />
          <path d="M6 4h7" />
        </svg>
      );
    case 'accommodation':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-hidden="true"
        >
          <path d="M12 3l9 6v12a1 1 0 01-1 1h-6v-6h-4v6H4a1 1 0 01-1-1V9l9-6z" />
        </svg>
      );
    case 'flight':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-hidden="true"
        >
          <path d="M21 16.5v-1.764a1 1 0 00-.553-.894L13 10V5.5a1.5 1.5 0 00-3 0V10l-7.447 3.842A1 1 0 002 14.736V16.5l9-1.5v3.764l-2.553.894A1 1 0 008 21.5h2l1.333-.5L12.667 21.5H15a1 1 0 00.553-1.842L13 18.764V15l8 1.5z" />
        </svg>
      );
    case 'transport':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M6 7a4 4 0 014-4h4a4 4 0 014 4v8a3 3 0 01-3 3H9a3 3 0 01-3-3V7z" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
          <circle cx="10" cy="15" r="1" />
          <circle cx="14" cy="15" r="1" />
          <path d="M9 18l-2 2" />
          <path d="M15 18l2 2" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M12 22s7-7 7-13a7 7 0 10-14 0c0 6 7 13 7 13z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
  }
}

function TravelModeIcon({ mode }) {
  const className = 'h-4 w-4';
  const strokeProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  switch (mode) {
    case 'walk':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <circle cx="12" cy="5" r="2" />
          <path d="M8 22l2-5-2-3 2-4 4 1 2 3" />
          <path d="M14 10l-1 4 3 3" />
          <path d="M6 15l-2 3" />
        </svg>
      );
    case 'train':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M7 4h10a4 4 0 014 4v7a3 3 0 01-3 3H6a3 3 0 01-3-3V8a4 4 0 014-4z" />
          <path d="M7 8h10" />
          <path d="M7 11h10" />
          <circle cx="9" cy="16" r="1" />
          <circle cx="15" cy="16" r="1" />
          <path d="M8 19l-2 2" />
          <path d="M16 19l2 2" />
        </svg>
      );
    case 'tube':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <rect x="5" y="3" width="14" height="16" rx="5" />
          <path d="M8 9h8" />
          <path d="M8 12h8" />
          <circle cx="9" cy="16" r="1" />
          <circle cx="15" cy="16" r="1" />
          <path d="M8 19l-2 2" />
          <path d="M16 19l2 2" />
        </svg>
      );
    case 'taxi':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11" />
          <path d="M4 11h16a2 2 0 012 2v3" />
          <path d="M4 16v-3a2 2 0 012-2" />
          <circle cx="8" cy="17" r="1.5" />
          <circle cx="16" cy="17" r="1.5" />
          <path d="M10 5h4" />
        </svg>
      );
    case 'car':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11" />
          <path d="M4 11h16a2 2 0 012 2v3" />
          <path d="M4 16v-3a2 2 0 012-2" />
          <circle cx="8" cy="17" r="1.5" />
          <circle cx="16" cy="17" r="1.5" />
        </svg>
      );
    case 'flight':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
          <path d="M2.5 14.5l8.5-3V5a2 2 0 014 0v6.5l8.5 3" />
          <path d="M10.5 12.5v6l1.5-1 1.5 1v-6" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...strokeProps}>
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
