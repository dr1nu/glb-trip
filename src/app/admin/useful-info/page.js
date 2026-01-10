'use client';

import { useEffect, useState } from 'react';
import {
  CITY_TRANSPORT_CARDS,
  COUNTRY_TRANSPORT_SITES,
  COUNTRY_USEFUL_INFO,
} from '@/data/destinationUsefulInfo';

const DEFAULT_CITY_CARD = {
  city: '',
  country: '',
  cardName: '',
  officialUrl: '',
  faresUrl: '',
  singleFare: '',
  passLabel: '',
  passFare: '',
};

const DEFAULT_COUNTRY_INFO = {
  country: '',
  currency: { code: '', name: '' },
  payments: '',
  power: { types: [], voltage: '', frequency: '' },
};


function normalizeCityTransportList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((entry) => ({
    ...DEFAULT_CITY_CARD,
    officialUrl:
      entry.officialUrl ||
      entry.transportUrl ||
      entry.transportWebsite ||
      entry.transportwebsiteUrl ||
      '',
    faresUrl: entry.faresUrl || entry.fareUrl || '',
    ...entry,
  }));
}

function normalizeCountryInfoList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((entry) => {
    const currency = typeof entry?.currency === 'object' && entry.currency
      ? entry.currency
      : DEFAULT_COUNTRY_INFO.currency;
    const power = typeof entry?.power === 'object' && entry.power
      ? entry.power
      : DEFAULT_COUNTRY_INFO.power;
    return {
      ...DEFAULT_COUNTRY_INFO,
      ...entry,
      currency: { ...DEFAULT_COUNTRY_INFO.currency, ...currency },
      power: { ...DEFAULT_COUNTRY_INFO.power, ...power },
    };
  });
}

function normalizeCountryTransportSites(list) {
  if (!Array.isArray(list)) return [];
  return list.map((entry) => ({
    country: entry?.country ?? '',
    officialUrl:
      entry?.officialUrl ||
      entry?.transportUrl ||
      entry?.transportWebsite ||
      entry?.transportwebsiteUrl ||
      '',
    faresUrl: entry?.faresUrl || entry?.fareUrl || '',
  }));
}

function sanitizePowerTypes(value) {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toPowerTypesLabel(types) {
  if (!Array.isArray(types)) return '';
  return types.join(', ');
}

export default function AdminUsefulInfoPage() {
  const [cityTransport, setCityTransport] = useState(() => normalizeCityTransportList(CITY_TRANSPORT_CARDS));
  const [countryInfo, setCountryInfo] = useState(() => normalizeCountryInfoList(COUNTRY_USEFUL_INFO));
  const [countryTransportSites, setCountryTransportSites] = useState(() =>
    normalizeCountryTransportSites(COUNTRY_TRANSPORT_SITES)
  );
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadSettings() {
      try {
        const response = await fetch('/api/useful-info-settings');
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore && Array.isArray(data?.cityTransport)) {
          const next = data.cityTransport.length ? data.cityTransport : CITY_TRANSPORT_CARDS;
          setCityTransport(normalizeCityTransportList(next));
        }
        if (!ignore && Array.isArray(data?.countryInfo)) {
          const next = data.countryInfo.length ? data.countryInfo : COUNTRY_USEFUL_INFO;
          setCountryInfo(normalizeCountryInfoList(next));
        }
        if (!ignore && Array.isArray(data?.countryTransportSites)) {
          const next = data.countryTransportSites.length
            ? data.countryTransportSites
            : COUNTRY_TRANSPORT_SITES;
          setCountryTransportSites(normalizeCountryTransportSites(next));
        }
      } catch (err) {
        console.warn('Failed to load useful info settings', err);
      }
    }
    loadSettings();
    return () => {
      ignore = true;
    };
  }, []);

  function updateCityTransport(index, patch) {
    setCityTransport((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addCityTransport() {
    setCityTransport((prev) => [...prev, { ...DEFAULT_CITY_CARD }]);
  }

  function removeCityTransport(index) {
    setCityTransport((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCountryInfo(index, patch) {
    setCountryInfo((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function updateCountryCurrency(index, patch) {
    setCountryInfo((prev) => {
      const next = [...prev];
      const existing = next[index] ?? DEFAULT_COUNTRY_INFO;
      next[index] = {
        ...existing,
        currency: { ...existing.currency, ...patch },
      };
      return next;
    });
  }

  function updateCountryPower(index, patch) {
    setCountryInfo((prev) => {
      const next = [...prev];
      const existing = next[index] ?? DEFAULT_COUNTRY_INFO;
      next[index] = {
        ...existing,
        power: { ...existing.power, ...patch },
      };
      return next;
    });
  }

  function addCountryInfo() {
    setCountryInfo((prev) => [...prev, { ...DEFAULT_COUNTRY_INFO }]);
  }

  function removeCountryInfo(index) {
    setCountryInfo((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCountryTransportSite(index, patch) {
    setCountryTransportSites((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addCountryTransportSite() {
    setCountryTransportSites((prev) => [...prev, { country: '', officialUrl: '', faresUrl: '' }]);
  }

  function removeCountryTransportSite(index) {
    setCountryTransportSites((prev) => prev.filter((_, i) => i !== index));
  }

  function resetDefaults() {
    setCityTransport(normalizeCityTransportList(CITY_TRANSPORT_CARDS));
    setCountryInfo(normalizeCountryInfoList(COUNTRY_USEFUL_INFO));
    setCountryTransportSites(normalizeCountryTransportSites(COUNTRY_TRANSPORT_SITES));
    setStatus({ type: '', message: '' });
  }

  async function saveSettings() {
    setStatus({ type: '', message: '' });
    setIsSaving(true);
    try {
      const response = await fetch('/api/useful-info-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityTransport, countryInfo, countryTransportSites }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save settings.');
      }
      setStatus({ type: 'success', message: 'Useful info settings saved.' });
      if (Array.isArray(data?.cityTransport)) {
        setCityTransport(normalizeCityTransportList(data.cityTransport));
      }
      if (Array.isArray(data?.countryInfo)) {
        setCountryInfo(normalizeCountryInfoList(data.countryInfo));
      }
      if (Array.isArray(data?.countryTransportSites)) {
        setCountryTransportSites(normalizeCountryTransportSites(data.countryTransportSites));
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to save settings.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Useful info settings</h1>
        <p className="text-sm text-neutral-400">
          Manage transport, currency, and power information shown in the trip useful info tab.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">City transport cards</h2>
            <p className="text-sm text-neutral-400">City-level transport details override country info.</p>
          </div>
          <button
            type="button"
            onClick={addCityTransport}
            className="rounded-xl border border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:border-orange-400 hover:text-white transition"
          >
            Add city
          </button>
        </div>

        <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
          {cityTransport.map((item, index) => (
            <div key={`${item.city}-${item.country}-${index}`} className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1.2fr_auto]">
                <input
                  value={item.city ?? ''}
                  onChange={(event) => updateCityTransport(index, { city: event.target.value })}
                  placeholder="City"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
                <input
                  value={item.country ?? ''}
                  onChange={(event) => updateCityTransport(index, { country: event.target.value })}
                  placeholder="Country"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
                <input
                  value={item.cardName ?? ''}
                  onChange={(event) => updateCityTransport(index, { cardName: event.target.value })}
                  placeholder="Card name"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
                <input
                  value={item.officialUrl ?? ''}
                  onChange={(event) => updateCityTransport(index, { officialUrl: event.target.value })}
                  placeholder="Official transport URL"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeCityTransport(index)}
                  className="rounded-xl border border-neutral-800 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-orange-400 hover:text-white transition"
                >
                  Remove
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1.6fr]">
                <input
                  value={item.singleFare ?? ''}
                  onChange={(event) => updateCityTransport(index, { singleFare: event.target.value })}
                  placeholder="Single ride fare"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
                <input
                  value={item.passLabel ?? ''}
                  onChange={(event) => updateCityTransport(index, { passLabel: event.target.value })}
                  placeholder="Pass label (e.g. 24h pass)"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
                <input
                  value={item.passFare ?? ''}
                  onChange={(event) => updateCityTransport(index, { passFare: event.target.value })}
                  placeholder="Pass fare"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
                <input
                  value={item.faresUrl ?? ''}
                  onChange={(event) => updateCityTransport(index, { faresUrl: event.target.value })}
                  placeholder="Fares page URL (optional)"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Country useful info</h2>
            <p className="text-sm text-neutral-400">Includes currency, payments, and power.</p>
          </div>
          <button
            type="button"
            onClick={addCountryInfo}
            className="rounded-xl border border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:border-orange-400 hover:text-white transition"
          >
            Add country
          </button>
        </div>

        <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
          {countryInfo.map((item, index) => (
            <div key={`${item.country}-${index}`} className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="grid gap-3 md:grid-cols-[1.2fr_0.6fr_0.9fr_auto]">
                <input
                  value={item.country ?? ''}
                  onChange={(event) => updateCountryInfo(index, { country: event.target.value })}
                  placeholder="Country"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
                <input
                  value={item.currency?.code ?? ''}
                  onChange={(event) => updateCountryCurrency(index, { code: event.target.value })}
                  placeholder="Currency code"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
                <input
                  value={item.currency?.name ?? ''}
                  onChange={(event) => updateCountryCurrency(index, { name: event.target.value })}
                  placeholder="Currency name"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeCountryInfo(index)}
                  className="rounded-xl border border-neutral-800 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-orange-400 hover:text-white transition"
                >
                  Remove
                </button>
              </div>

              <input
                value={item.payments ?? ''}
                onChange={(event) => updateCountryInfo(index, { payments: event.target.value })}
                placeholder="Payments guidance"
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
              />

              <div className="grid gap-3 md:grid-cols-[1fr_0.6fr_0.6fr]">
                <input
                  value={toPowerTypesLabel(item.power?.types)}
                  onChange={(event) => updateCountryPower(index, { types: sanitizePowerTypes(event.target.value) })}
                  placeholder="Power plug types (e.g. C, F)"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
                <input
                  value={item.power?.voltage ?? ''}
                  onChange={(event) => updateCountryPower(index, { voltage: event.target.value })}
                  placeholder="Voltage"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
                <input
                  value={item.power?.frequency ?? ''}
                  onChange={(event) => updateCountryPower(index, { frequency: event.target.value })}
                  placeholder="Frequency"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
              </div>

            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Country transport sites</h2>
            <p className="text-sm text-neutral-400">Used when no city transport match exists.</p>
          </div>
          <button
            type="button"
            onClick={addCountryTransportSite}
            className="rounded-xl border border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:border-orange-400 hover:text-white transition"
          >
            Add country transport
          </button>
        </div>

        <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
          {countryTransportSites.map((item, index) => (
            <div key={`${item.country}-${index}`} className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1.6fr_auto]">
                <input
                  value={item.country ?? ''}
                  onChange={(event) => updateCountryTransportSite(index, { country: event.target.value })}
                  placeholder="Country"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
                <input
                  value={item.officialUrl ?? ''}
                  onChange={(event) => updateCountryTransportSite(index, { officialUrl: event.target.value })}
                  placeholder="Official transport URL"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeCountryTransportSite(index)}
                  className="rounded-xl border border-neutral-800 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-orange-400 hover:text-white transition"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_1.6fr]">
                <input
                  value={item.faresUrl ?? ''}
                  onChange={(event) => updateCountryTransportSite(index, { faresUrl: event.target.value })}
                  placeholder="Fares page URL (optional)"
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-400 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={resetDefaults}
          className="rounded-xl border border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:border-orange-400 hover:text-white transition"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={saveSettings}
          className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-500/30 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save settings'}
        </button>
        {status.message ? (
          <span className={`text-xs ${status.type === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
            {status.message}
          </span>
        ) : null}
      </div>
    </div>
  );
}
