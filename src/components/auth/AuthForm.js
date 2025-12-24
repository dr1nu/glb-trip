'use client';

import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { EUROPE_COUNTRIES } from '@/lib/countries-europe';
import {
  DEFAULT_TRAVEL_PREFERENCES,
  mergeTravelPreferences,
  TRAVEL_INTERESTS,
} from '@/lib/travel-preferences';
import { composeProfilePayload, splitFullName } from '@/lib/profile';

export default function AuthForm({
  supabase,
  defaultName = '',
  defaultFirstName = '',
  defaultLastName = '',
  defaultEmail = '',
  defaultHomeCountry = '',
  defaultNearestAirport = '',
  defaultPreferences = DEFAULT_TRAVEL_PREFERENCES,
  onSuccess,
  layout = 'modal',
  showHeading = true,
  initialMode = 'signup',
  onRequestSignup,
  hideModeToggleFooter = false,
}) {
  const derived = splitFullName(defaultName);
  const [mode, setMode] = useState(initialMode);
  const [fields, setFields] = useState({
    firstName: defaultFirstName || derived.firstName || '',
    lastName: defaultLastName || derived.lastName || '',
    email: defaultEmail,
    homeCountry: defaultHomeCountry,
    nearestAirport: defaultNearestAirport,
    password: '',
    confirmPassword: '',
  });
  const [preferences, setPreferences] = useState(() =>
    mergeTravelPreferences(defaultPreferences)
  );
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const next = splitFullName(defaultName);
    setFields((prev) => ({
      ...prev,
      firstName: prev.firstName || defaultFirstName || next.firstName || '',
      lastName: prev.lastName || defaultLastName || next.lastName || '',
      email: prev.email || defaultEmail || '',
      homeCountry: prev.homeCountry || defaultHomeCountry || '',
      nearestAirport: prev.nearestAirport || defaultNearestAirport || '',
    }));
  }, [
    defaultName,
    defaultFirstName,
    defaultLastName,
    defaultEmail,
    defaultHomeCountry,
    defaultNearestAirport,
  ]);

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setMessage('');
  }, [initialMode]);

  useEffect(() => {
    setPreferences(mergeTravelPreferences(defaultPreferences));
  }, [defaultPreferences]);

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function handlePreferenceChange(name, value) {
    setPreferences((prev) => ({ ...prev, [name]: value }));
  }

  function toggleInterest(value, checked) {
    setPreferences((prev) => {
      const interests = checked
        ? [...new Set([...prev.interests, value])]
        : prev.interests.filter((item) => item !== value);
      return { ...prev, interests };
    });
  }

  async function persistProfile(overrides = {}) {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overrides),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || 'Failed to save your profile.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signup') {
        if (fields.password !== fields.confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        const normalizedFirstName = fields.firstName.trim();
        const normalizedLastName = fields.lastName.trim();
        const normalizedName = [normalizedFirstName, normalizedLastName]
          .filter(Boolean)
          .join(' ')
          .trim();
        const email = fields.email.trim();
        const redirectTo =
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined;
        const profileOverrides = {
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          name: normalizedName,
          email,
          homeCountry: fields.homeCountry,
          nearestAirport: fields.nearestAirport.trim(),
          travelPreferences: preferences,
        };
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password: fields.password,
          options: {
            data: {
              ...profileOverrides,
            },
            emailRedirectTo: redirectTo,
          },
        });
        if (authError) throw authError;
        const session = data?.session ?? null;
        const user = data?.user ?? null;
        if (session && user) {
          await persistProfile(profileOverrides);
          setMessage('Account created! You are now signed in.');
          const payload = composeProfilePayload(user, profileOverrides);
          onSuccess?.(payload);
        } else {
          setMessage(
            'Check your email to confirm your account. Once verified, sign in to continue.'
          );
          setMode('signin');
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: fields.email.trim(),
          password: fields.password,
        });
        if (authError) throw authError;
        const { data } = await supabase.auth.getUser();
        const payload = composeProfilePayload(data?.user ?? null);
        onSuccess?.(payload);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    if (isResetting || isSubmitting) return;
    const email = fields.email.trim();
    if (!email) {
      setError('Enter your email to reset your password.');
      return;
    }
    setIsResetting(true);
    setError('');
    setMessage('');
    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/reset`
          : undefined;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo }
      );
      if (resetError) throw resetError;
      setMessage('If this email exists, a reset link is on its way.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link.');
    } finally {
      setIsResetting(false);
    }
  }

  const isLightLayout = layout === 'account-card' || layout === 'page';
  const containerClasses =
    {
      modal: 'space-y-6 bg-neutral-900 border border-neutral-800 rounded-2xl p-6',
      inline: 'space-y-6',
      page: 'space-y-6 bg-white border border-neutral-200 rounded-2xl p-6 text-neutral-900',
      'account-card': 'space-y-5 text-neutral-800',
    }[layout] || 'space-y-6';
  const fieldClasses = isLightLayout
    ? 'w-full rounded-xl px-4 py-3 text-sm transition bg-white border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 shadow-sm focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400 focus:outline-none'
    : 'w-full rounded-xl px-3 py-2 text-sm transition bg-neutral-900 border border-neutral-700 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500';
  const interestInactiveClass = isLightLayout
    ? 'border-neutral-200 text-neutral-600 bg-white hover:border-orange-200 hover:text-orange-600'
    : 'border-neutral-700 text-neutral-300';
  const interestActiveClass = isLightLayout
    ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm shadow-orange-100'
    : 'border-orange-500 text-orange-300';
  const submitButtonClass = `w-full font-semibold text-sm py-3 rounded-xl transition-colors ${
    isSubmitting
      ? isLightLayout
        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
        : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
      : isLightLayout
      ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-200/70'
      : 'bg-orange-500 hover:bg-orange-600 text-neutral-900'
  }`;
  const footerTextClass = isLightLayout ? 'text-neutral-500' : 'text-neutral-400';
  const footerLinkClass = isLightLayout
    ? 'text-orange-500 hover:text-orange-600'
    : 'text-orange-400 hover:text-orange-300';
  const errorClass = isLightLayout
    ? 'text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2'
    : 'text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2';
  const messageClass = isLightLayout
    ? 'text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2'
    : 'text-sm text-green-300 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2';
  const headingVisible =
    typeof showHeading === 'boolean' ? showHeading : true;

  return (
    <form className={containerClasses} onSubmit={handleSubmit}>
      {headingVisible ? (
        <div>
          <h2 className="text-xl font-semibold">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            {mode === 'signup'
              ? 'Save trips, come back anytime, and speed up future planning.'
              : 'Sign in to continue planning your getaway.'}
          </p>
        </div>
      ) : null}

      {mode === 'signup' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Name</span>
              <input
                required
                name="firstName"
                type="text"
                value={fields.firstName}
                onChange={handleFieldChange}
                className={fieldClasses}
                placeholder="Jane"
                autoComplete="given-name"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Surname</span>
              <input
                required
                name="lastName"
                type="text"
                value={fields.lastName}
                onChange={handleFieldChange}
                className={fieldClasses}
                placeholder="Doe"
                autoComplete="family-name"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Home Country</span>
              <select
                required
                name="homeCountry"
                value={fields.homeCountry}
                onChange={handleFieldChange}
                className={fieldClasses}
              >
                <option value="" disabled>
                  Select your country
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
                name="nearestAirport"
                type="text"
                value={fields.nearestAirport}
                onChange={handleFieldChange}
                className={fieldClasses}
                placeholder="e.g. London Gatwick"
              />
            </label>
          </div>
        </>
      ) : null}

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Email</span>
        <input
          required
          name="email"
          type="email"
          value={fields.email}
          onChange={handleFieldChange}
          className={fieldClasses}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Password</span>
        <input
          required
          name="password"
          type="password"
          value={fields.password}
          onChange={handleFieldChange}
          className={fieldClasses}
          placeholder="••••••••"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />
        {mode === 'signin' ? (
          <button
            type="button"
            onClick={handlePasswordReset}
            className={footerLinkClass}
            disabled={isResetting || isSubmitting}
          >
            {isResetting ? 'Sending reset link…' : 'Forgot password?'}
          </button>
        ) : null}
      </label>

      {mode === 'signup' ? (
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Confirm Password</span>
          <input
            required
            name="confirmPassword"
            type="password"
            value={fields.confirmPassword}
            onChange={handleFieldChange}
            className={fieldClasses}
            placeholder="Repeat your password"
            autoComplete="new-password"
          />
        </label>
      ) : null}

      {mode === 'signup' ? (
        <div className="space-y-2">
          <span className="text-sm font-medium">Travel interests</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {TRAVEL_INTERESTS.map((interest) => (
              <label
                key={interest}
                className={`rounded-xl border px-3 py-2 cursor-pointer ${
                  preferences.interests.includes(interest)
                    ? interestActiveClass
                    : interestInactiveClass
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
      ) : null}

      {error ? (
        <div className={errorClass}>{error}</div>
      ) : null}
      {message ? (
        <div className={messageClass}>{message}</div>
      ) : null}

      <button type="submit" disabled={isSubmitting} className={submitButtonClass}>
        {isSubmitting
          ? 'Working…'
          : mode === 'signup'
          ? 'Create account'
          : 'Sign in'}
      </button>

      {hideModeToggleFooter ? null : (
        <p className={`text-xs text-center ${footerTextClass}`}>
          {mode === 'signup' ? 'Already have an account?' : 'Need an account?'}{' '}
          <button
            type="button"
            className={footerLinkClass}
            onClick={() => {
              if (mode === 'signup') {
                setMode('signin');
                setError('');
                setMessage('');
                return;
              }
              if (onRequestSignup) {
                onRequestSignup();
                return;
              }
              setMode('signup');
              setError('');
              setMessage('');
            }}
          >
            {mode === 'signup' ? 'Sign in' : 'Create one'}
          </button>
        </p>
      )}
    </form>
  );
}

AuthForm.propTypes = {
  supabase: PropTypes.shape({
    auth: PropTypes.shape({
      signUp: PropTypes.func.isRequired,
      signInWithPassword: PropTypes.func.isRequired,
      getUser: PropTypes.func.isRequired,
      resetPasswordForEmail: PropTypes.func.isRequired,
    }).isRequired,
    from: PropTypes.func.isRequired,
  }).isRequired,
  defaultName: PropTypes.string,
  defaultFirstName: PropTypes.string,
  defaultLastName: PropTypes.string,
  defaultEmail: PropTypes.string,
  defaultHomeCountry: PropTypes.string,
  defaultNearestAirport: PropTypes.string,
  defaultPreferences: PropTypes.object,
  onSuccess: PropTypes.func,
  layout: PropTypes.oneOf(['modal', 'inline', 'page', 'account-card']),
  showHeading: PropTypes.bool,
  initialMode: PropTypes.oneOf(['signup', 'signin']),
  onRequestSignup: PropTypes.func,
  hideModeToggleFooter: PropTypes.bool,
};
