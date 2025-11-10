'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import AuthForm from '@/components/auth/AuthForm';

const tabs = [
  { key: 'home', label: 'Home', href: '/', icon: HomeIcon },
  { key: 'trips', label: 'My Trips', href: '/my-trips', icon: TripsIcon },
  { key: 'account', label: 'My Account', icon: AccountIcon },
];

export default function AppFooter() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [overlay, setOverlay] = useState(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        setReady(true);
      }
    );
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  function closeOverlay() {
    setOverlay(null);
  }

  function handleTabPress(tab) {
    if (tab.key === 'home') {
      router.push('/');
      closeOverlay();
      return;
    }
    if (tab.key === 'trips') {
      if (user) {
        router.push('/my-trips');
        closeOverlay();
      } else {
        setOverlay('trips');
      }
      return;
    }
    if (tab.key === 'account') {
      if (user) {
        setOverlay('account');
      } else {
        setOverlay('auth');
      }
    }
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          {tabs.map((tab) => {
            const isActive =
              (tab.key === 'home' && pathname === '/') ||
              (tab.href && pathname === tab.href);
            const Icon = tab.icon;
            const baseClasses =
              'flex-1 flex flex-col items-center gap-1 text-xs font-medium py-2 rounded-xl transition-colors';
            const activeClasses = isActive ? 'text-orange-400' : 'text-neutral-400';

            if (tab.key === 'home') {
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`${baseClasses} ${activeClasses}`}
                >
                  <Icon active={isActive} />
                  {tab.label}
                </Link>
              );
            }

            if (tab.href && tab.key !== 'account') {
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`${baseClasses} ${activeClasses}`}
                >
                  <Icon active={isActive} />
                  {tab.label}
                </Link>
              );
            }

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabPress(tab)}
                className={`${baseClasses} ${
                  tab.key === 'account' && user ? 'text-orange-400' : activeClasses
                }`}
              >
                <Icon active={tab.key === 'account' && !!user} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
      {overlay ? (
        <Overlay onClose={closeOverlay}>
          {renderOverlayContent({
            overlay,
            user,
            supabase,
            ready,
            onClose: closeOverlay,
            setOverlay,
          })}
        </Overlay>
      ) : null}
    </>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-end pb-24 px-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
        {children}
        <button
          type="button"
          onClick={onClose}
          className="w-full text-sm font-medium py-2 rounded-xl border border-neutral-700 text-neutral-300 hover:text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function renderOverlayContent({ overlay, user, supabase, ready, onClose, setOverlay }) {
  if (overlay === 'trips') {
    return (
      <div className="space-y-2 text-sm text-neutral-300">
        <h3 className="text-lg font-semibold text-neutral-100">Sign in to view trips</h3>
        <p>
          Create an account to save itineraries and find them here. Once you&apos;re in, this
          tab will open your saved trips automatically.
        </p>
        <button
          type="button"
          className="w-full bg-orange-500 text-neutral-900 font-semibold py-2 rounded-xl"
          onClick={() => setOverlay('auth')}
        >
          Create account / Log in
        </button>
      </div>
    );
  }

  if (overlay === 'account') {
    return (
      <div className="space-y-4 text-sm">
        <div>
          <h3 className="text-lg font-semibold text-neutral-100">My account</h3>
          <p className="text-neutral-400">Signed in as {user?.email}</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Name</p>
          <p className="text-sm font-medium text-neutral-100">
            {user?.user_metadata?.name || '—'}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-neutral-500 mt-3">Country</p>
          <p className="text-sm font-medium text-neutral-100">
            {user?.user_metadata?.country || '—'}
          </p>
        </div>
        <button
          type="button"
          className="w-full text-sm font-semibold py-2 rounded-xl border border-neutral-700 text-neutral-300 hover:text-white"
          onClick={async () => {
            await supabase.auth.signOut();
            onClose();
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  if (overlay === 'auth') {
    return ready ? (
      <AuthForm
        supabase={supabase}
        onSuccess={() => {
          setOverlay(null);
        }}
      />
    ) : (
      <div className="text-sm text-neutral-400">Loading…</div>
    );
  }

  return null;
}

function IconWrapper({ children, active }) {
  return (
    <span
      className={`h-6 w-6 flex items-center justify-center rounded-full border ${
        active ? 'border-orange-400 text-orange-400' : 'border-neutral-600 text-neutral-400'
      }`}
    >
      {children}
    </span>
  );
}

function HomeIcon({ active }) {
  return (
    <IconWrapper active={active}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-4 w-4"
      >
        <path d="M3 11.5L12 4l9 7.5" />
        <path d="M5 10.5V20h14v-9.5" />
      </svg>
    </IconWrapper>
  );
}

function TripsIcon({ active }) {
  return (
    <IconWrapper active={active}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-4 w-4"
      >
        <path d="M12 21s6-4.5 6-9a6 6 0 10-12 0c0 4.5 6 9 6 9z" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    </IconWrapper>
  );
}

function AccountIcon({ active }) {
  return (
    <IconWrapper active={active}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-4 w-4"
      >
        <circle cx="12" cy="8" r="3" />
        <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" />
      </svg>
    </IconWrapper>
  );
}
