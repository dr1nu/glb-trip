'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/admin', label: 'Trips' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/templates', label: 'Templates' },
  { href: '/admin/homepage', label: 'Homepage' },
];

export default function AdminNav() {
  const pathname = usePathname() || '';

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm">
      {items.map((item) => {
        const isActive =
          item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full border px-3 py-1 transition-colors ${
              isActive
                ? 'border-orange-400 text-orange-200'
                : 'border-neutral-800 text-neutral-300 hover:border-neutral-600 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
