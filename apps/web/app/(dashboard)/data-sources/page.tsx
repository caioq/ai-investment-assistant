import localFont from "next/font/local";
import { cookies } from "next/headers";

import { apiFetch } from "../../../lib/api-client";
import type { DataSourcesSummary } from "../../../lib/types";
import { DataSourcesPanel } from "../../../components/data-sources/DataSourcesPanel";

const ACCESS_TOKEN_COOKIE = "access_token";

// Fraunces was loaded only by `app/(auth)/layout.tsx`; this page's header
// needs it inside `(dashboard)` too. Self-hosted through `next/font/local`
// from `app/fonts/`, the same way the `(auth)` layout loads it — never
// `next/font/google`, which fetches the face at build time.
const fraunces = localFont({
  src: "../../fonts/Fraunces-latin-variable.woff2",
  variable: "--font-fraunces",
  weight: "500 600",
  display: "swap",
});

const FRAUNCES_STACK = "var(--font-fraunces), Georgia, serif";

/** What the four cards fall back to when the summary fetch fails. */
const EMPTY_SUMMARY: DataSourcesSummary = {
  assets: { count: 0, tickers: [], lastImportAt: null },
  holdings: { count: 0, lastImportAt: null },
  wallets: [],
  report: null,
};

/**
 * `/data-sources` — a Server Component inheriting the `(dashboard)` group's
 * auth guard (see `(dashboard)/layout.tsx`), which fetches
 * `GET /data-sources/summary` forwarding the `access_token` cookie itself,
 * exactly as `(dashboard)/page.tsx` does.
 *
 * A rejected summary fetch degrades to `EMPTY_SUMMARY` — four "Never
 * imported" cards — rather than taking the page down (`CONVENTIONS.md` →
 * "Dashboard page composition"): the page's whole job is to let someone
 * import a file, and a failed *status* read must not block that.
 *
 * Selection state (and, from US-2 onwards, the import panels themselves)
 * lives in the `'use client'` `DataSourcesPanel` below, not here.
 */
export default async function DataSourcesPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  let summary = EMPTY_SUMMARY;
  try {
    summary = await apiFetch<DataSourcesSummary>("/data-sources/summary", {
      headers: { Cookie: `${ACCESS_TOKEN_COOKIE}=${accessToken}` },
    });
  } catch {
    summary = EMPTY_SUMMARY;
  }

  return (
    <div
      className={fraunces.variable}
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <div>
        <h1
          style={{
            fontFamily: FRAUNCES_STACK,
            fontSize: 26,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          Data sources
        </h1>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--text-secondary)",
            marginTop: 6,
            maxWidth: 640,
            lineHeight: 1.5,
          }}
        >
          Base data behind holdings, allocation and AI Advisor reviews. Import
          assets first: holdings and model wallets are matched against the
          asset master by ticker.
        </p>
      </div>

      <DataSourcesPanel summary={summary} />
    </div>
  );
}
