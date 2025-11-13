'use client';

import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

export default function AuthForm({
  supabase,
  defaultName = '',
  defaultEmail = '',
  defaultCountry = '',
  onSuccess,
  layout = 'modal',
}) {
  const [mode, setMode] = useState('signup');
  const [fields, setFields] = useState({
    name: defaultName,
    email: defaultEmail,
    country: defaultCountry,
    password: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFields((prev) => ({
      ...prev,
      name: prev.name || defaultName,
      email: prev.email || defaultEmail,
      country: prev.country || defaultCountry,
    }));
  }, [defaultName, defaultEmail, defaultCountry]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  async function upsertProfile(user, name, country) {
    if (!user) return;
    const payload = {
      id: user.id,
      name: name || user.user_metadata?.name || '',
      country: country || user.user_metadata?.country || '',
      email: user.email || '',
    };
    await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signup') {
        const { error: authError } = await supabase.auth.signUp({
          email: fields.email,
          password: fields.password,
          options: {
            data: {
              name: fields.name,
              country: fields.country,
            },
          },
        });
        if (authError) throw authError;
        const { data } = await supabase.auth.getUser();
        await upsertProfile(data?.user, fields.name, fields.country);
        setMessage('Account created! You are now signed in.');
        onSuccess?.({
          user: data?.user ?? null,
          name: fields.name,
          email: fields.email,
          country: fields.country,
        });
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: fields.email,
          password: fields.password,
        });
        if (authError) throw authError;
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          await upsertProfile(data.user,
            fields.name || data.user.user_metadata?.name || '',
            fields.country || data.user.user_metadata?.country || ''
          );
        }
        onSuccess?.({
          user: data?.user ?? null,
          name: data?.user?.user_metadata?.name ?? fields.name,
          email: data?.user?.email ?? fields.email,
          country: data?.user?.user_metadata?.country ?? fields.country,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const containerClasses =
    layout === 'inline'
      ? 'space-y-5'
      : 'space-y-5 bg-neutral-900 border border-neutral-800 rounded-2xl p-6';

  return (
    <form className={containerClasses} onSubmit={handleSubmit}>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {mode === 'signup' ? (
          <>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Full name</span>
              <input
                required
                name="name"
                type="text"
                value={fields.name}
                onChange={handleChange}
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Jane Doe"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">Country of residence</span>
              <input
                required
                name="country"
                type="text"
                value={fields.country}
                onChange={handleChange}
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Where you live"
              />
            </label>
          </>
        ) : null}
        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium">Email</span>
          <input
            required
            name="email"
            type="email"
            value={fields.email}
            onChange={handleChange}
            className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">Password</span>
        <input
          required
          name="password"
          type="password"
          value={fields.password}
          onChange={handleChange}
          className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="••••••••"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />
      </label>

      {error ? (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="text-sm text-green-300 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2">
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full font-semibold text-sm py-3 rounded-xl transition-colors ${
          isSubmitting
            ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
            : 'bg-orange-500 hover:bg-orange-600 text-neutral-900'
        }`}
      >
        {isSubmitting
          ? 'Working…'
          : mode === 'signup'
          ? 'Create account'
          : 'Sign in'}
      </button>

      <p className="text-xs text-neutral-400 text-center">
        {mode === 'signup' ? 'Already have an account?' : 'Need an account?'}{' '}
        <button
          type="button"
          className="text-orange-400 hover:text-orange-300"
          onClick={() => {
            setMode(mode === 'signup' ? 'signin' : 'signup');
            setError('');
            setMessage('');
          }}
        >
          {mode === 'signup' ? 'Sign in' : 'Create one'}
        </button>
      </p>
    </form>
  );
}

AuthForm.propTypes = {
  supabase: PropTypes.shape({
    auth: PropTypes.shape({
      signUp: PropTypes.func.isRequired,
      signInWithPassword: PropTypes.func.isRequired,
      getUser: PropTypes.func.isRequired,
    }).isRequired,
    from: PropTypes.func.isRequired,
  }).isRequired,
  defaultName: PropTypes.string,
  defaultEmail: PropTypes.string,
  defaultCountry: PropTypes.string,
  onSuccess: PropTypes.func,
  layout: PropTypes.oneOf(['modal', 'inline']),
};
