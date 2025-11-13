'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import AppFooter from './AppFooter';

const ALLOWED_PATHS = ['/', '/my-trips', '/account'];

function isAllowed(pathname) {
  if (!pathname) return false;
  if (pathname === '/') return true;
  if (pathname.startsWith('/my-trips')) return true;
  if (pathname.startsWith('/account')) return true;
  return false;
}

export default function FooterSlot() {
  const pathname = usePathname();
  const [currentPath, setCurrentPath] = useState(null);

  useEffect(() => {
    setCurrentPath(pathname);
  }, [pathname]);

  if (!isAllowed(currentPath)) {
    return null;
  }

  return <AppFooter />;
}
