'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bed,
  Camera,
  Car,
  CarTaxiFront,
  ChevronLeft,
  ChevronRight,
  Church,
  Coffee,
  CreditCard,
  ExternalLink,
  Footprints,
  Hotel,
  Landmark,
  MapPin,
  Plane,
  PlugZap,
  ShoppingBag,
  TrainFront,
  TramFront,
  Trees,
  Utensils,
} from 'lucide-react';
import ItinerarySummary from '../../_components/ItinerarySummary';
import {
  CITY_TRANSPORT_CARDS,
  COUNTRY_TRANSPORT_SITES,
  COUNTRY_USEFUL_INFO,
} from '@/data/destinationUsefulInfo';

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
  const [usefulInfoSettings, setUsefulInfoSettings] = useState({
    cityTransport: CITY_TRANSPORT_CARDS,
    countryInfo: COUNTRY_USEFUL_INFO,
    countryTransportSites: COUNTRY_TRANSPORT_SITES,
  });

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

  useEffect(() => {
    let ignore = false;
    async function loadUsefulInfoSettings() {
      try {
        const response = await fetch('/api/useful-info-settings');
        if (!response.ok) return;
        const data = await response.json();
        if (ignore) return;
        setUsefulInfoSettings({
          cityTransport: Array.isArray(data?.cityTransport) ? data.cityTransport : CITY_TRANSPORT_CARDS,
          countryInfo: Array.isArray(data?.countryInfo) ? data.countryInfo : COUNTRY_USEFUL_INFO,
          countryTransportSites: Array.isArray(data?.countryTransportSites)
            ? data.countryTransportSites
            : COUNTRY_TRANSPORT_SITES,
        });
      } catch (err) {
        if (!ignore) {
          console.warn('Failed to load useful info settings', err);
        }
      }
    }
    loadUsefulInfoSettings();
    return () => {
      ignore = true;
    };
  }, []);

  const usefulInfoCards = useMemo(() => buildUsefulInfoCards({
    destinationCountry,
    dayCards,
    summaryCards,
    settings: usefulInfoSettings,
  }), [destinationCountry, dayCards, summaryCards, usefulInfoSettings]);

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
    if (usefulPosts.length > 0 || usefulInfoCards.length > 0) {
      tabs.push({
        id: 'useful-info',
        label: 'Useful Info',
        content: <UsefulInfoGrid posts={usefulPosts} cards={usefulInfoCards} />,
      });
    }

    daysToRender.forEach((card, index) => {
      tabs.push({
        id: card.id ?? `day-${index + 1}`,
        label: card.title ?? `Day ${index + 1}`,
        content: <DayItineraryDetail card={card} dayIndex={index} preferences={preferences} />,
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
    usefulInfoCards,
  ]);

  const [activeTab, setActiveTab] = useState(tabDefinitions[0]?.id);
  useEffect(() => {
    if (tabDefinitions.length === 0) return;
    setActiveTab((prev) => (tabDefinitions.some((t) => t.id === prev) ? prev : tabDefinitions[0].id));
  }, [tabDefinitions]);

  const activeContent = tabDefinitions.find((tab) => tab.id === activeTab);
  const activeIndex = tabDefinitions.findIndex((tab) => tab.id === activeTab);
  const prevTab = activeIndex > 0 ? tabDefinitions[activeIndex - 1] : null;
  const nextTab =
    activeIndex >= 0 && activeIndex < tabDefinitions.length - 1
      ? tabDefinitions[activeIndex + 1]
      : null;

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

      <div className="mt-6 bg-white/60 border border-orange-100 rounded-3xl p-2 sm:p-4 min-h-[60vh]">
        {activeContent ? (
          <div className="overflow-y-auto max-h-full pr-0">
            {activeContent.content}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => prevTab && setActiveTab(prevTab.id)}
          disabled={!prevTab}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition sm:w-auto ${
            prevTab
              ? 'border-orange-100 bg-white text-[#C2461E] hover:bg-orange-50'
              : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
          {prevTab ? `Previous: ${prevTab.label}` : 'Previous'}
        </button>
        <button
          type="button"
          onClick={() => nextTab && setActiveTab(nextTab.id)}
          disabled={!nextTab}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition sm:w-auto ${
            nextTab
              ? 'border-orange-100 bg-white text-[#C2461E] hover:bg-orange-50'
              : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {nextTab ? `Next: ${nextTab.label}` : 'Next'}
          <ChevronRight className="h-4 w-4" />
        </button>
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

function UsefulInfoGrid({ posts, cards }) {
  const safeCards = Array.isArray(cards) ? cards : [];
  const safePosts = Array.isArray(posts) ? posts : [];

  return (
    <div className="space-y-6">
      {safeCards.length ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {safeCards.map((card) => (
            <UsefulInfoCard key={card.id} card={card} />
          ))}
        </div>
      ) : null}
      {safePosts.length ? (
        <div className="grid grid-cols-1 gap-4">
          {safePosts.map((post) => (
            <UsefulPostCard key={post.id} post={post} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function UsefulInfoCard({ card }) {
  const rows = Array.isArray(card?.rows) ? card.rows : [];
  const helperNote =
    card?.helperNote ||
    (card?.kind === 'transport'
      ? 'Prices change often based on zones and time. Check the official site for the latest fares.'
      : '');

  return (
    <article className="overflow-hidden rounded-2xl border border-orange-100 bg-white p-5 shadow-sm shadow-orange-100/40">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-700">
          <UsefulInfoIcon kind={card.kind} />
        </span>
        <div>
          <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
          {card.subtitle ? (
            <p className="text-xs text-[#4C5A6B]">{card.subtitle}</p>
          ) : null}
        </div>
      </div>
      {rows.length ? (
        <div className="mt-4 space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-[#4C5A6B]">{row.label}</span>
              <span className="text-slate-900 font-semibold text-right">{row.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {helperNote ? (
        <p className="mt-3 text-xs text-[#4C5A6B]">{helperNote}</p>
      ) : null}
      {Array.isArray(card.links) && card.links.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
          {card.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
            >
              {link.label || 'Official site'} <ExternalIcon />
            </a>
          ))}
        </div>
      ) : card.link?.url ? (
        <a
          href={card.link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-orange-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
        >
          {card.link.label || 'Official site'} <ExternalIcon />
        </a>
      ) : null}
    </article>
  );
}

function UsefulInfoIcon({ kind }) {
  const className = 'h-5 w-5';
  const iconProps = { className, strokeWidth: 1.7, 'aria-hidden': true };
  switch (kind) {
    case 'transport':
      return <TramFront {...iconProps} />;
    case 'payments':
      return <CreditCard {...iconProps} />;
    case 'power':
      return <PlugZap {...iconProps} />;
    default:
      return <MapPin {...iconProps} />;
  }
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


function buildUsefulInfoCards({ destinationCountry, dayCards, summaryCards, settings }) {
  if (!destinationCountry) return [];

  const countryInfo = findCountryInfo(destinationCountry, settings?.countryInfo);
  const cards = [];

  const transportCards = buildTransportCards({ destinationCountry, dayCards, summaryCards, settings });
  cards.push(...transportCards);

  const currencyLabel = countryInfo?.currency
    ? `${countryInfo.currency.code} (${countryInfo.currency.name})`
    : 'Check local currency';
  const paymentsNote = countryInfo?.payments ?? 'Card acceptance varies; keep small cash handy.';

  cards.push({
    id: `currency-${normalizeLookup(destinationCountry)}`,
    kind: 'payments',
    title: 'Currency & payments',
    subtitle: destinationCountry,
    rows: [
      { label: 'Currency', value: currencyLabel },
      { label: 'Payments', value: paymentsNote },
    ],
  });

  const plugTypes = countryInfo?.power?.types?.length
    ? countryInfo.power.types.join(', ')
    : 'Check local plug types';
  const voltage = countryInfo?.power?.voltage ?? 'Varies';
  const frequency = countryInfo?.power?.frequency ?? 'Varies';

  cards.push({
    id: `power-${normalizeLookup(destinationCountry)}`,
    kind: 'power',
    title: 'Power & plugs',
    subtitle: destinationCountry,
    rows: [
      { label: 'Plug types', value: plugTypes },
      { label: 'Voltage', value: voltage },
      { label: 'Frequency', value: frequency },
    ],
    note: 'Pack a universal adapter if you are unsure.',
  });

  return cards;
}

function buildTransportCards({ destinationCountry, dayCards, summaryCards, settings }) {
  const cityCandidates = getCityCandidates(dayCards, summaryCards);
  const normalizedCountry = normalizeLookup(destinationCountry);
  const matched = [];
  const cityTransport = Array.isArray(settings?.cityTransport) ? settings.cityTransport : CITY_TRANSPORT_CARDS;

  cityTransport.forEach((entry) => {
    if (normalizeLookup(entry.country) !== normalizedCountry) return;
    const entryCity = normalizeLookup(entry.city);
    const found = cityCandidates.find((candidate) => normalizeLookup(candidate.city) === entryCity);
    if (found) {
      matched.push(entry);
    }
  });

  if (matched.length > 0) {
    return matched.map((entry) => {
      const rows = buildTransportRows({
        singleFare: entry.singleFare,
        passLabel: entry.passLabel,
        passFare: entry.passFare,
      });
      const links = buildTransportLinks(entry);
      return {
        id: `transport-${normalizeLookup(entry.city)}`,
        kind: 'transport',
        title: `${entry.city} transport`,
        subtitle: entry.cardName,
        rows,
        links,
        helperNote:
          'Prices change often based on zones and time. Check the official site for the latest fares.',
      };
    });
  }

  const countrySite = findCountryTransportSite(destinationCountry, settings?.countryTransportSites);
  if (countrySite) {
    const rows = buildTransportRows({});
    const links = buildTransportLinks(countrySite);
    return [
      {
        id: `transport-${normalizeLookup(destinationCountry)}`,
        kind: 'transport',
        title: 'Public transport',
        subtitle: destinationCountry,
        rows,
        links,
        helperNote:
          'Prices change often based on zones and time. Check the official site for the latest fares.',
      },
    ];
  }

  return [
    {
      id: `transport-${normalizeLookup(destinationCountry)}`,
      kind: 'transport',
      title: 'Public transport',
      subtitle: destinationCountry,
      rows: [
        { label: 'Tip', value: 'Most cities offer day passes and reloadable cards.' },
      ],
      note: 'Choose passes based on how many rides you plan per day.',
    },
  ];
}

function getCityCandidates(dayCards, summaryCards) {
  const map = new Map();
  const cards = [...(Array.isArray(dayCards) ? dayCards : []), ...(Array.isArray(summaryCards) ? summaryCards : [])];

  cards.forEach((card) => {
    const fields = card?.fields ?? {};
    const city = typeof fields.city === 'string' && fields.city.trim()
      ? fields.city.trim()
      : typeof card?.subtitle === 'string' && card.subtitle.trim()
      ? card.subtitle.trim()
      : '';
    if (!city) return;
    const key = normalizeLookup(city);
    if (!key) return;
    const existing = map.get(key) ?? { city, count: 0 };
    existing.count += 1;
    if (!existing.city || existing.city.length < city.length) {
      existing.city = city;
    }
    map.set(key, existing);
  });

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function findCountryInfo(country, entries) {
  const normalized = normalizeLookup(country);
  const source = Array.isArray(entries) ? entries : COUNTRY_USEFUL_INFO;
  return source.find((entry) => normalizeLookup(entry.country) === normalized) || null;
}

function normalizeLookup(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/&/g, 'and')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildTransportRows({ singleFare, passLabel, passFare }) {
  const rows = [];
  if (singleFare) rows.push({ label: 'Single ride', value: singleFare });
  if (passLabel && passFare) rows.push({ label: passLabel, value: passFare });
  if (rows.length === 0) {
    rows.push({ label: 'Tip', value: 'Check the official site for current fares.' });
  }
  return rows;
}

function buildTransportLinks(entry) {
  if (!entry || typeof entry !== 'object') return [];
  const officialUrl =
    entry.officialUrl ||
    entry.transportUrl ||
    entry.transportWebsite ||
    entry.transportwebsiteUrl ||
    entry.url ||
    entry.website ||
    '';
  const faresUrl = entry.faresUrl || entry.fareUrl || '';
  const links = [];
  if (officialUrl) {
    links.push({ label: 'Official site', url: officialUrl });
  }
  if (faresUrl) {
    links.push({ label: 'Fares', url: faresUrl });
  }
  return links;
}

function findCountryTransportSite(country, entries) {
  const normalized = normalizeLookup(country);
  const source = Array.isArray(entries) ? entries : COUNTRY_TRANSPORT_SITES;
  return source.find((entry) => normalizeLookup(entry.country) === normalized) || null;
}

function getFeaturedImage(post) {
  const media = post?._embedded?.['wp:featuredmedia']?.[0];
  return media?.source_url || '';
}

function stripHtml(value) {
  if (typeof value !== 'string') return '';
  if (typeof window !== 'undefined' && window.DOMParser) {
    const doc = new DOMParser().parseFromString(value, 'text/html');
    return (doc.body?.textContent || '').trim();
  }
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
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

function DayItineraryDetail({ card, dayIndex, preferences }) {
  const fields = card?.fields ?? {};
  const city = fields.city || card?.subtitle || 'Destination';
  const highlight = fields.highlightAttraction || card?.summary;
  const cost = fields.dailyCost || card?.priceLabel;
  const notes = card?.notes;
  const timeline = Array.isArray(card?.timeline) ? card.timeline : [];
  const useCurrentLocation = isTripDayToday(dayIndex, preferences);

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
                nextEntry={timeline[index + 1]}
                useCurrentLocation={useCurrentLocation}
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
            nextEntry={activities[index + 1]}
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
  tube: { label: 'Tube / metro', border: 'border-purple-200' },
  taxi: { label: 'Taxi', border: 'border-amber-200' },
  car: { label: 'Car / transfer', border: 'border-emerald-200' },
};
const DISALLOWED_TRAVEL_MODES = new Set(['train', 'flight']);

function TimelineEntry({ entry, nextEntry, useCurrentLocation = false, isLast }) {
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
  const normalizedBadge = normalizePriceBadge(rawBadge);
  const isFree = normalizedBadge.toLowerCase() === 'free';
  const badgeClass = isFree
    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    : 'bg-slate-100 text-slate-900 border border-slate-200';
  const badge = normalizedBadge;
  const link = typeof fields.link === 'string' ? fields.link.trim() : '';
  const description = typeof fields.description === 'string' ? fields.description.trim() : '';
  const travelMode =
    typeof fields.travelMode === 'string' ? fields.travelMode.trim().toLowerCase() : '';
  const displayTravelMode = DISALLOWED_TRAVEL_MODES.has(travelMode) ? '' : travelMode;
  const travelDuration =
    typeof fields.travelDuration === 'string' ? fields.travelDuration.trim() : '';
  const travelMeta = TRAVEL_META[displayTravelMode] ?? null;
  const travelDurationLabel = formatDuration(travelDuration);
  const nextTitle = getEntryTitle(nextEntry);
  const directionsUrl =
    displayTravelMode && nextTitle
      ? buildDirectionsUrl(
          useCurrentLocation ? '' : title,
          nextTitle,
          displayTravelMode,
          { preferCurrentLocation: useCurrentLocation }
        )
      : '';

  return (
    <div className="relative flex flex-col pb-8">
      <article className={`relative overflow-hidden rounded-2xl border ${meta.border} bg-white shadow-sm`}>
        <div className={`absolute left-0 top-0 h-full w-1 ${meta.rail}`} />
        <div className="p-5 space-y-3">
          <div className="sm:hidden">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-start gap-1">
                <span className="text-[12px] font-semibold text-[#245ad4]">
                  {time || '—'}
                </span>
                <span
                  className={`h-9 w-9 rounded-full border ${meta.iconBg} flex items-center justify-center`}
                >
                  <ExperienceIcon type={entry?.type} />
                </span>
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="relative pr-6">
                  <p className="text-[13px] font-semibold text-slate-900 break-words leading-snug pr-6">
                    {title}
                  </p>
                  {badge ? (
                    <span
                      className={`absolute right-0 top-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-center ${badgeClass}`}
                    >
                      {badge}
                    </span>
                  ) : null}
                </div>
                {description ? (
                  <p className="mt-1 text-[11px] text-[#4C5A6B] break-words leading-snug">
                    {description}
                  </p>
                ) : null}
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-orange-500 text-orange-600 px-3 py-2 text-xs font-semibold hover:bg-orange-50 transition-colors"
                  >
                    Book now <ExternalIcon />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <div className="hidden sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <span className="min-w-[64px] text-center text-sm font-semibold text-[#245ad4]">
                {time || '—'}
              </span>
              <div className="flex items-center gap-3 min-w-0">
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
              <div className="flex flex-col items-end gap-3 min-w-[96px]">
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-500 text-orange-600 px-3 py-2 text-sm font-semibold hover:bg-orange-50 transition-colors"
                  >
                    Book now <ExternalIcon />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </article>
      {displayTravelMode ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#4C5A6B]">
          <span
            className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 ${travelMeta?.border ?? 'border-slate-200'}`}
          >
            <TravelModeIcon mode={displayTravelMode} />
            <span className="font-semibold text-slate-800">
              {travelMeta?.label ?? 'Travel'}
            </span>
            {travelDurationLabel ? <span className="text-[#4C5A6B]">• {travelDurationLabel}</span> : null}
          </span>
          {directionsUrl ? (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              Directions <ExternalIcon />
            </a>
          ) : null}
        </div>
      ) : null}
      {!isLast ? <span className="absolute left-5 right-5 bottom-2 h-px bg-slate-200" /> : null}
    </div>
  );
}

function ExperienceIcon({ type }) {
  const className = 'h-6 w-6';
  const iconProps = { className, strokeWidth: 1.6, 'aria-hidden': true };
  switch (type) {
    case 'attraction':
      return <MapPin {...iconProps} />;
    case 'museum':
      return <Landmark {...iconProps} />;
    case 'park':
      return <Trees {...iconProps} />;
    case 'church':
      return <Church {...iconProps} />;
    case 'shopping':
      return <ShoppingBag {...iconProps} />;
    case 'photo':
      return <Camera {...iconProps} />;
    case 'rest':
      return <Bed {...iconProps} />;
    case 'food':
      return <Utensils {...iconProps} />;
    case 'coffee':
      return <Coffee {...iconProps} />;
    case 'accommodation':
      return <Hotel {...iconProps} />;
    case 'flight':
      return <Plane {...iconProps} />;
    case 'transport':
      return <TrainFront {...iconProps} />;
    default:
      return <MapPin {...iconProps} />;
  }
}

function TravelModeIcon({ mode }) {
  const className = 'h-4 w-4';
  const iconProps = { className, strokeWidth: 1.6, 'aria-hidden': true };
  switch (mode) {
    case 'walk':
      return <Footprints {...iconProps} />;
    case 'train':
      return <TrainFront {...iconProps} />;
    case 'tube':
      return <TramFront {...iconProps} />;
    case 'taxi':
      return <CarTaxiFront {...iconProps} />;
    case 'car':
      return <Car {...iconProps} />;
    case 'flight':
      return <Plane {...iconProps} />;
    default:
      return <MapPin {...iconProps} />;
  }
}

function ExternalIcon() {
  return <ExternalLink className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />;
}

function normalizePriceBadge(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase() === 'free') return 'Free';
  if (isZeroPrice(trimmed)) return 'Free';
  return trimmed;
}

function isZeroPrice(value) {
  if (!value) return false;
  if (/^[\s$€£]*0+(\.0+)?[\s$€£]*$/.test(value)) return true;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric === 0) return true;
  return false;
}

function getEntryTitle(entry) {
  if (!entry) return '';
  const fields = entry?.fields ?? {};
  if (typeof fields.title === 'string' && fields.title.trim()) {
    return fields.title.trim();
  }
  const meta = ENTRY_META[entry?.type] ?? DEFAULT_ENTRY_META;
  return meta.label;
}

function buildDirectionsUrl(origin, destination, travelMode, options = {}) {
  const { preferCurrentLocation = false } = options;
  if (!destination) return '';
  if (!origin && !preferCurrentLocation) return '';
  const modeMap = {
    walk: 'walking',
    tube: 'transit',
    taxi: 'driving',
    car: 'driving',
  };
  const params = new URLSearchParams({
    api: '1',
    destination,
  });
  if (origin) params.set('origin', origin);
  const mappedMode = modeMap[travelMode];
  if (mappedMode) params.set('travelmode', mappedMode);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function parseLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = typeof value === 'string' ? value.trim() : String(value);
  if (!raw) return null;
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isTripDayToday(dayIndex, preferences) {
  if (!Number.isFinite(dayIndex)) return false;
  const startDate = parseLocalDate(preferences?.dateFrom);
  if (!startDate) return false;
  const tripDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + dayIndex);
  const today = new Date();
  return (
    tripDay.getFullYear() === today.getFullYear() &&
    tripDay.getMonth() === today.getMonth() &&
    tripDay.getDate() === today.getDate()
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
