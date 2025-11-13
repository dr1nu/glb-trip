'use client';

import { useEffect, useMemo, useState } from 'react';
import { EUROPE_COUNTRIES } from '@/lib/countries-europe';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import AuthForm from '@/components/auth/AuthForm';
import {
  DEFAULT_TRAVEL_PREFERENCES,
  mergeTravelPreferences,
  TRAVEL_INTERESTS,
} from '@/lib/travel-preferences';

export default function AccountPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
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
          const mergedPrefs = mergeTravelPreferences(
            data?.travel_preferences ?? user.user_metadata?.travelPreferences
          );
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

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-100 px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-400">
            My Account
          </p>
          <h1 className="text-3xl font-semibold">Manage your details</h1>
          <p className="text-sm text-neutral-400">
            Update your profile and travel preferences. We&apos;ll use these to
            pre-fill future trip requests.
          </p>
        </header>

        {initializing || loadingProfile ? (
          <div className="rounded-3xl border border-neutral-800 bg-neutral-800/60 p-8 text-center text-sm text-neutral-400">
            Loading your account…
          </div>
        ) : null}

        {!initializing && !user ? (
          <section className="rounded-3xl border border-neutral-800 bg-neutral-800/70 p-6">
            <div className="mb-6 space-y-2">
              <h2 className="text-2xl font-semibold">Create your account</h2>
              <p className="text-sm text-neutral-400">
                Need access to My Trips or want your preferences saved? Create an account or sign in
                below.
              </p>
            </div>
            <AuthForm
              supabase={supabase}
              layout="inline"
              showHeading={false}
              onSuccess={handleAuthSuccess}
            />
          </section>
        ) : null}

        {user ? (
          <section className="rounded-3xl border border-neutral-800 bg-neutral-800/70 p-6">
            <form className="space-y-6" onSubmit={handleSave}>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Profile</h2>
                <p className="text-sm text-neutral-400">
                  Keep this info up to date so we can tailor your itineraries faster.
                </p>
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
                    className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                    className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                  className="cursor-not-allowed rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-500"
                />
                <span className="text-xs text-neutral-500">
                  Email updates require assistance from support (coming soon).
                </span>
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
                    className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {EUROPE_COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium">Nearest Airport</span>
                  <input
                    required
                    type="text"
                    name="nearestAirport"
                    value={profile.nearestAirport}
                    onChange={(event) =>
                      setProfile((prev) => ({ ...prev, nearestAirport: event.target.value }))
                    }
                    className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Lisbon"
                  />
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">Travel preferences</h3>
                  <p className="text-sm text-neutral-400">
                    These will populate each trip request automatically. Update anytime.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 rounded-2xl border border-neutral-700 p-4">
                    <span className="text-sm font-medium text-neutral-200">Interests</span>
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      {TRAVEL_INTERESTS.map((interest) => (
                        <label
                          key={interest}
                          className={`cursor-pointer rounded-xl border px-3 py-2 ${
                            preferences.interests.includes(interest)
                              ? 'border-orange-500 text-orange-300'
                              : 'border-neutral-700 text-neutral-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            value={interest}
                            checked={preferences.interests.includes(interest)}
                            onChange={(event) => toggleInterest(interest, event.target.checked)}
                            className="hidden"
                          />
                          {interest}
                        </label>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              ) : null}
              {message ? (
                <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
                  {message}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={saving}
                  className={`inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition sm:w-auto ${
                    saving
                      ? 'cursor-not-allowed bg-neutral-700 text-neutral-400'
                      : 'bg-orange-500 text-neutral-900 hover:bg-orange-600'
                  }`}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-200 transition hover:text-white sm:w-auto"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </div>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}
