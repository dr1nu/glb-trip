'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Home, LayoutGrid, Users } from 'lucide-react';

const items = [
  { href: '/admin', label: 'Trip Requests', key: 'trips', icon: ClipboardList },
  { href: '/admin/users', label: 'Users', key: 'users', icon: Users },
  { href: '/admin/templates', label: 'Templates', key: 'templates', icon: LayoutGrid },
  { href: '/admin/homepage', label: 'Homepage', key: 'homepage', icon: Home },
];

export default function AdminNav({ tripCount = null }) {
  const pathname = usePathname() || '';

  return (
    <nav className="flex flex-wrap items-center gap-3 text-sm">
      {items.map((item) => {
        const isActive =
          item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        const showCount = item.key === 'trips' && typeof tripCount === 'number';
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2 transition-colors ${
              isActive
                ? 'border-orange-200 bg-[#ffe9d5] text-orange-700'
                : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
            {showCount ? (
              <span className="ml-1 rounded-full bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white">
                {tripCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
