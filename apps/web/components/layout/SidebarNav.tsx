'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/holdings', label: 'Holdings' },
  { href: '/data-sources', label: 'Data sources' },
] as const;

/**
 * The `(dashboard)` rail's navigation. Extracted out of the group's layout
 * (a Server Component holding the `getCurrentUser` guard) because
 * `usePathname` is client-only — marking the layout `'use client'` would
 * drag the guard to the client with it.
 */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {NAV_ITEMS.map((item) => {
        const isActive = isActiveHref(item.href, pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-current={isActive ? 'page' : undefined}
            style={{
              padding: '8px 10px',
              borderRadius: '10px',
              textAlign: 'center',
              textDecoration: 'none',
              background: isActive ? 'var(--bg-card-alt)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * `/` only matches itself — every path starts with it, so prefix matching
 * would light up Dashboard on `/data-sources` too. The others match their
 * own path and anything nested under it (`/holdings/ABEV3`).
 */
function isActiveHref(href: string, pathname: string | null): boolean {
  if (pathname === null) {
    return false;
  }

  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
