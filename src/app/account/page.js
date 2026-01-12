'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { User } from 'lucide-react';
import { HOME_COUNTRIES } from '@/lib/countries-europe';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import AuthForm from '@/components/auth/AuthForm';
import {
  DEFAULT_TRAVEL_PREFERENCES,
  mergeTravelPreferences,
  TRAVEL_INTERESTS,
} from '@/lib/travel-preferences';
import { getAirportsForCountry } from '@/lib/airports-by-country';

export default function AccountPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    homeCountry: '',
    nearestAirport: '',
  });
  const [preferences, setPreferences] = useState(() => ({
    ...DEFAULT_TRAVEL_PREFERENCES,
    interests: [...DEFAULT_TRAVEL_PREFERENCES.interests],
  }));
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState('signin');
  const airportsForCountry = useMemo(
    () => getAirportsForCountry(profile.homeCountry),
    [profile.homeCountry]
  );
  const hasMeaningfulPreferences = (prefs) => {
    if (!prefs) return false;
    if (Array.isArray(prefs.interests) && prefs.interests.length > 0) return true;
    return Object.keys(DEFAULT_TRAVEL_PREFERENCES).some((key) => {
      if (key === 'interests') return false;
      const value = prefs[key];
      return value && value !== DEFAULT_TRAVEL_PREFERENCES[key];
    });
  };

  useEffect(() => {
    const mode = (searchParams?.get('mode') || '').toLowerCase();
    if (mode === 'signup' || mode === 'signin') {
      setAuthMode(mode);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setInitializing(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        setInitializing(false);
      }
    );
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!user) {
      setProfile({
        firstName: '',
        lastName: '',
        email: '',
        homeCountry: '',
        nearestAirport: '',
      });
      setPreferences(mergeTravelPreferences());
      setLoadingProfile(false);
      return;
    }
    let active = true;
    setLoadingProfile(true);
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Failed to load profile', fetchError);
          setError('Unable to load your profile.');
        } else {
          const profilePrefs = mergeTravelPreferences(data?.travel_preferences);
          const metadataPrefs = mergeTravelPreferences(
            user.user_metadata?.travelPreferences
          );
          const mergedPrefs = hasMeaningfulPreferences(profilePrefs)
            ? profilePrefs
            : metadataPrefs;
          setProfile({
            firstName: data?.first_name ?? user.user_metadata?.firstName ?? '',
            lastName: data?.last_name ?? user.user_metadata?.lastName ?? '',
            email: user.email ?? data?.email ?? '',
            homeCountry:
              data?.home_country ??
              user.user_metadata?.homeCountry ??
              user.user_metadata?.country ??
              '',
            nearestAirport:
              data?.nearest_airport ?? user.user_metadata?.nearestAirport ?? '',
          });
          setPreferences(mergedPrefs);
          setError('');
        }
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });
    return () => {
      active = false;
    };
  }, [supabase, user]);

  useEffect(() => {
    if (!profile.homeCountry) {
      setProfile((prev) =>
        prev.nearestAirport ? { ...prev, nearestAirport: '' } : prev
      );
      return;
    }

    if (airportsForCountry.length === 0) {
      return;
    }

    setProfile((prev) => {
      if (prev.nearestAirport && airportsForCountry.includes(prev.nearestAirport)) {
        return prev;
      }
      return { ...prev, nearestAirport: airportsForCountry[0] };
    });
  }, [airportsForCountry, profile.homeCountry]);

  function handlePreferenceChange(name, value) {
    setPreferences((prev) => ({ ...prev, [name]: value }));
  }

  function toggleInterest(value, checked) {
    setPreferences((prev) => {
      const interests = checked
        ? [...new Set([...(prev.interests || []), value])]
        : (prev.interests || []).filter((item) => item !== value);
      return { ...prev, interests };
    });
  }

  async function persistProfileToServer(payload) {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || 'Failed to save your profile.');
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setMessage('');
    setError('');

    const firstName = profile.firstName.trim();
    const lastName = profile.lastName.trim();
    const payload = {
      firstName,
      lastName,
      name: [firstName, lastName].filter(Boolean).join(' ').trim(),
      email: profile.email,
      homeCountry: profile.homeCountry,
      nearestAirport: profile.nearestAirport.trim(),
      travelPreferences: preferences,
    };

    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          firstName,
          lastName,
          name: payload.name,
          homeCountry: profile.homeCountry,
          nearestAirport: payload.nearestAirport,
          travelPreferences: preferences,
        },
      });
      if (authError) throw authError;

      await persistProfileToServer(payload);

      setMessage('Profile updated successfully.');
      setUser((prev) =>
        prev
          ? {
              ...prev,
              user_metadata: {
                ...(prev.user_metadata || {}),
                firstName,
                lastName,
                name: payload.name,
                homeCountry: profile.homeCountry,
                nearestAirport: payload.nearestAirport,
                travelPreferences: preferences,
              },
            }
          : prev
      );
    } catch (err) {
      console.error('Failed to update profile', err);
      setError('We could not update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  function handleAuthSuccess(payload) {
    setUser(payload.user ?? null);
    if (payload) {
      setProfile({
        firstName: payload.firstName ?? '',
        lastName: payload.lastName ?? '',
        email: payload.email ?? '',
        homeCountry: payload.homeCountry ?? '',
        nearestAirport: payload.nearestAirport ?? '',
      });
      setPreferences(mergeTravelPreferences(payload.travelPreferences));
    }
  }

  const showAuthCard = !initializing && !user;
  const mainClassName =
    'min-h-screen bg-gradient-to-b from-[#eaf3ff] via-white to-[#fffaf5] text-slate-900 px-4 py-10';

  return (
    <main className={mainClassName}>
      {showAuthCard ? (
        <div className="mx-auto flex min-h-[80vh] w-full max-w-5xl flex-col items-center justify-center px-2">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500 shadow-sm shadow-blue-100">
              <User className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-[#0F172A]">Welcome Back</h1>
              <p className="text-sm text-[#374151]">
                Sign in to access your trips and account
              </p>
            </div>
          </div>

          <div className="w-full max-w-xl">
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl shadow-orange-100/60 md:p-8">
              <div className="mb-6 grid grid-cols-2 gap-2 rounded-full bg-neutral-100 p-1 text-sm font-semibold">
                <button
                  type="button"
                  className={`rounded-full py-2 transition ${authMode === 'signin' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#374151] hover:text-neutral-800'}`}
                  onClick={() => setAuthMode('signin')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`rounded-full py-2 transition ${authMode === 'signup' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#374151] hover:text-neutral-800'}`}
                  onClick={() => setAuthMode('signup')}
                >
                  Sign Up
                </button>
              </div>

              <AuthForm
                supabase={supabase}
                layout="account-card"
                showHeading={false}
                initialMode={authMode}
                hideModeToggleFooter
                onRequestSignup={() => setAuthMode('signup')}
                onSuccess={handleAuthSuccess}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <header className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-widest text-orange-400">
              My Account
            </p>
            <h1 className="text-3xl font-semibold">Manage your details</h1>
            <p className="text-sm text-[#374151]">
              Update your profile and travel preferences. We&apos;ll use these to pre-fill future
              trip requests.
            </p>
          </header>

          {initializing || loadingProfile ? (
            <div className="rounded-3xl border border-[#E3E6EF] bg-white p-8 text-center text-sm text-[#374151] shadow-lg shadow-orange-100/60">
              Loading your account…
            </div>
          ) : null}

          {user ? (
            <section className="rounded-3xl border border-[#E3E6EF] bg-white p-6 shadow-xl shadow-orange-100/60">
              <form className="space-y-6" onSubmit={handleSave}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">Profile</h2>
                    <p className="text-sm text-[#374151]">
                      Keep this info up to date so we can tailor your itineraries faster.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl border border-orange-200 px-5 py-2 text-sm font-semibold text-[#C2461E] transition hover:bg-[#FFE7DA]"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">Name</span>
                    <input
                      required
                      type="text"
                      name="firstName"
                      value={profile.firstName}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, firstName: event.target.value }))
                      }
                      className="rounded-xl border border-[#E3E6EF] bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                      placeholder="Jane"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">Surname</span>
                    <input
                      required
                      type="text"
                      name="lastName"
                      value={profile.lastName}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, lastName: event.target.value }))
                      }
                      className="rounded-xl border border-[#E3E6EF] bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                      placeholder="Doe"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">Email</span>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="cursor-not-allowed rounded-xl border border-[#E3E6EF] bg-white px-3 py-2 text-[#374151]"
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">Home Country</span>
                    <select
                      required
                      name="homeCountry"
                      value={profile.homeCountry}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, homeCountry: event.target.value }))
                      }
                      className="rounded-xl border border-[#E3E6EF] bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A]"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {HOME_COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium">Nearest Airport</span>
                    <select
                      required
                      name="nearestAirport"
                      value={profile.nearestAirport}
                      disabled={!profile.homeCountry || airportsForCountry.length === 0}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, nearestAirport: event.target.value }))
                      }
                      className="rounded-xl border border-[#E3E6EF] bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FFB38A] disabled:cursor-not-allowed disabled:bg-neutral-50"
                    >
                      <option value="" disabled>
                        {profile.homeCountry ? 'Select an airport' : 'Select your home country first'}
                      </option>
                      {airportsForCountry.map((airport) => (
                        <option key={airport} value={airport}>
                          {airport}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold">Travel preferences</h3>
                    <p className="text-sm text-[#374151]">
                      These will populate each trip request automatically. Update anytime.
                    </p>
                  </div>

                  <div className="space-y-4">
                  <div className="space-y-2 rounded-2xl border border-[#E3E6EF] bg-white/60 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-[#0F172A]">Interests</span>
                        <span className="text-xs text-[#6B7280]">
                          Tap to select (toggle on/off)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        {TRAVEL_INTERESTS.map((interest) => (
                          <label
                            key={interest}
                            className={`flex min-h-[56px] items-center rounded-xl border px-3 py-2 transition ${
                              preferences.interests.includes(interest)
                                ? 'border-[#FF6B35] bg-gradient-to-br from-white via-[#FFF4EC] to-white text-[#C2461E] shadow-sm shadow-orange-100'
                                : 'border-orange-100 text-[#374151] hover:border-orange-200 hover:bg-orange-50/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              value={interest}
                              checked={preferences.interests.includes(interest)}
                              onChange={(event) => toggleInterest(interest, event.target.checked)}
                              className="hidden"
                            />
                            <div className="flex w-full items-center justify-between gap-2">
                              <span>{interest}</span>
                              <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold leading-none shrink-0 ${
                                  preferences.interests.includes(interest)
                                    ? 'bg-[#FF6B35] text-white'
                                    : 'border border-orange-200 text-[#C2461E]'
                                }`}
                              >
                                {preferences.interests.includes(interest) ? '✓' : '+'}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}
                {message ? (
                  <div className="rounded-xl border border-green-500/30 bg-green-50 px-3 py-2 text-sm text-green-700">
                    {message}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition sm:w-auto ${
                      saving
                        ? 'cursor-not-allowed bg-orange-100 text-[#374151]'
                        : 'bg-gradient-to-r from-[#FF8A3C] via-[#FF6B35] to-[#FF5B24] text-white shadow-md shadow-orange-200 hover:from-[#FF9B66] hover:to-[#FF5B24]'
                    }`}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
