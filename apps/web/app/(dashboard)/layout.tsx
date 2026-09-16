import type { ReactNode } from 'react';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { apiFetch } from '../../lib/api-client';
import { LogoutButton } from '../../components/auth/LogoutButton';

const ACCESS_TOKEN_COOKIE = 'access_token';

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Resolves the signed-in user from the `access_token` httpOnly cookie by
 * calling `GET /auth/me` through the api client, forwarding the cookie so
 * the API can verify its signature — this is the one guard every route in
 * the `(dashboard)` group inherits by living inside this layout, rather
 * than each page remembering to check auth itself.
 *
 * Any failure — no cookie at all, a 401 (invalid/expired token), or any
 * other error from the API — redirects to `/login`. Wrapped in React's
 * `cache()` so a page rendered alongside this layout (e.g. US-2's header)
 * can call this same function and reuse the result instead of firing a
 * second `GET /auth/me` within the same request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    redirect('/login');
    return null;
  }

  try {
    return await apiFetch<CurrentUser>('/auth/me', {
      headers: { Cookie: `${ACCESS_TOKEN_COOKIE}=${accessToken}` },
    });
  } catch {
    redirect('/login');
    return null;
  }
});

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/holdings', label: 'Holdings' },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 1fr',
        gridTemplateAreas: '"sidebar main"',
        minHeight: '100vh',
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
      }}
    >
      <aside
        style={{
          gridArea: 'sidebar',
          background: 'var(--bg-card)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '22px 10px',
          gap: '4px',
        }}
      >
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} title={item.label}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div title={user.name ?? user.email}>
            {(user.name ?? user.email).slice(0, 2).toUpperCase()}
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main
        style={{
          gridArea: 'main',
          overflowY: 'auto',
          padding: '32px 40px 64px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
        }}
      >
        {children}
      </main>
    </div>
  );
}
