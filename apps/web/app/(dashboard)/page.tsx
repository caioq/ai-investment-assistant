import { cookies } from "next/headers";

import { apiFetch } from "../../lib/api-client";
import { PortfolioHeader } from "../../components/dashboard/PortfolioHeader";
import { SummaryCards } from "../../components/dashboard/SummaryCards";
import type { PerformanceResponse, PortfolioSummary } from "../../lib/types";
import { getCurrentUser } from "./layout";

const ACCESS_TOKEN_COOKIE = "access_token";

const EMPTY_SUMMARY: PortfolioSummary = {
  totalInvested: 0,
  currentValue: 0,
  gainLoss: 0,
  returnPct: 0,
};

/**
 * `value[n] - value[n-1]` of the last two points of `GET /portfolio/performance`.
 * `null` (not `0`) when the series has fewer than two points — "flat" and
 * "unknown" are different claims (see `PortfolioHeader`/`US-2_T-1`).
 */
function deriveDayChange(series: { value: number }[] | undefined): {
  dayChange: number | null;
  dayChangePct: number | null;
} {
  if (!series || series.length < 2) {
    return { dayChange: null, dayChangePct: null };
  }

  const previous = series[series.length - 2].value;
  const latest = series[series.length - 1].value;
  const dayChange = latest - previous;
  const dayChangePct = previous !== 0 ? (dayChange / previous) * 100 : 0;

  return { dayChange, dayChangePct };
}

/**
 * Main dashboard page — a Server Component that composes the header and
 * summary cards from `GET /portfolio/summary` and `GET /portfolio/performance`.
 * The two fetches are issued concurrently (`Promise.allSettled`, not a
 * sequential `await` each) since the full dashboard ends up making five API
 * calls across this file (US-3/US-4/US-5/US-7 each add their own inside the
 * same `Promise.allSettled`/`Promise.all`).
 *
 * A rejected `/portfolio/performance` degrades rather than blanking the
 * page: the summary cards still render from a successful `/portfolio/summary`,
 * with the header's daily change falling back to `null` (an em-dash).
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const headers = { Cookie: `${ACCESS_TOKEN_COOKIE}=${accessToken}` };

  const [summaryResult, performanceResult] = await Promise.allSettled([
    apiFetch<PortfolioSummary>("/portfolio/summary", { headers }),
    apiFetch<PerformanceResponse>(
      "/portfolio/performance?range=6M&benchmark=IBOVESPA",
      { headers },
    ),
  ]);

  const summary =
    summaryResult.status === "fulfilled" ? summaryResult.value : EMPTY_SUMMARY;
  const performance =
    performanceResult.status === "fulfilled"
      ? performanceResult.value
      : undefined;

  const { dayChange, dayChangePct } = deriveDayChange(performance?.series);

  return (
    <>
      <PortfolioHeader
        userName={user?.name ?? user?.email ?? ""}
        currentValue={summary.currentValue}
        dayChange={dayChange}
        dayChangePct={dayChangePct}
      />
      <SummaryCards summary={summary} holdingsCount={0} />
    </>
  );
}
