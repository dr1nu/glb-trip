'use client';

import { usePathname } from 'next/navigation';
import AppFooter from './AppFooter';

export default function FooterSlot() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  return <AppFooter />;
}
