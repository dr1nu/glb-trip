'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import AuthForm from '@/components/auth/AuthForm';

const tabs = [
  { key: 'home', label: 'Home', href: '/', icon: HomeIcon },
  { key: 'trips', label: 'My Trips', href: '/my-trips', icon: TripsIcon },
  { key: 'account', label: 'My Account', href: '/account', icon: AccountIcon },
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
    if (tab.href) {
      router.push(tab.href);
      closeOverlay();
    }
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-orange-100 bg-white/90 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          {tabs.map((tab) => {
            const isActive =
              (tab.key === 'home' && pathname === '/') ||
              (tab.href && pathname === tab.href);
            const Icon = tab.icon;
            const baseClasses =
              'flex-1 flex flex-col items-center gap-1 text-xs font-semibold py-1.5 rounded-2xl transition-colors';
            const labelColor = isActive ? 'text-[#FF6B35]' : 'text-[#4C5A6B]';
            const iconColor = labelColor;

            if (tab.href) {
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`${baseClasses} ${labelColor}`}
                  onClick={() => handleTabPress(tab)}
                >
                  <Icon colorClass={iconColor} />
                  {tab.label}
                </Link>
              );
            }

            return null;
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
            router,
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

function renderOverlayContent({
  overlay,
  user,
  supabase,
  ready,
  onClose,
  setOverlay,
  router,
}) {
  if (overlay === 'trips') {
    return (
      <div className="space-y-3 text-sm text-neutral-300">
        <div>
          <h3 className="text-lg font-semibold text-neutral-100">Sign in to view trips</h3>
          <p>
            Create an account to save itineraries and find them here. Once you&apos;re in, this
            tab will open your saved trips automatically.
          </p>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            className="w-full rounded-xl bg-orange-500 py-2 font-semibold text-neutral-900"
            onClick={() => setOverlay('auth')}
          >
            Sign in
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-neutral-700 py-2 font-semibold text-neutral-200 hover:text-white"
            onClick={() => {
              onClose();
              router.push('/account');
            }}
          >
            Create an account
          </button>
        </div>
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

function IconWrapper({ children, colorClass }) {
  return (
    <span className={`flex h-6 w-6 items-center justify-center ${colorClass ?? ''}`}>
      {children}
    </span>
  );
}

function HomeIcon({ colorClass }) {
  return (
    <IconWrapper colorClass={colorClass}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <path d="M3 11.5L12 4l9 7.5" />
        <path d="M5 10.5V20h14v-9.5" />
      </svg>
    </IconWrapper>
  );
}

function TripsIcon({ colorClass }) {
  return (
    <IconWrapper colorClass={colorClass}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6 -translate-y-[1px]"
      >
        <path d="M12 21s6-4.5 6-9a6 6 0 10-12 0c0 4.5 6 9 6 9z" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    </IconWrapper>
  );
}

function AccountIcon({ colorClass }) {
  return (
    <IconWrapper colorClass={colorClass}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
      >
        <circle cx="12" cy="8" r="3" />
        <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" />
      </svg>
    </IconWrapper>
  );
}
