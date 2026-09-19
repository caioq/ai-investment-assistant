import { cookies } from "next/headers";

import { apiFetch, ApiError } from "../../lib/api-client";
import { PortfolioHeader } from "../../components/dashboard/PortfolioHeader";
import { SummaryCards } from "../../components/dashboard/SummaryCards";
import { AdvisorPanel } from "../../components/dashboard/advisor/AdvisorPanel";
import type {
  AdvisorAnalysis,
  PerformanceResponse,
  PortfolioSummary,
} from "../../lib/types";
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
 * Main dashboard page — a Server Component that composes the header,
 * summary cards, and `AdvisorPanel` from `GET /portfolio/summary`,
 * `GET /portfolio/performance`, and `GET /advisor/analysis/latest`. All
 * three fetches are issued concurrently (`Promise.allSettled`, not a
 * sequential `await` each) since the full dashboard ends up making five API
 * calls across this file (US-3/US-4/US-5 still owe their own, inside the
 * same `Promise.allSettled`/`Promise.all`).
 *
 * A rejected `/portfolio/performance` degrades rather than blanking the
 * page: the summary cards still render from a successful `/portfolio/summary`,
 * with the header's daily change falling back to `null` (an em-dash).
 *
 * `/advisor/analysis/latest` degrades in two different ways depending on
 * *why* it failed: a `404` is the expected response for a user who hasn't
 * generated an analysis yet, so the panel just starts `idle` with no notice
 * at all (see `US-7_T-5`); any other failure (e.g. a `500`) also starts the
 * panel `idle` — it must never take the rest of the page down — but with an
 * inline notice, since that case is unexpected rather than a new-user
 * default.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const headers = { Cookie: `${ACCESS_TOKEN_COOKIE}=${accessToken}` };

  const [summaryResult, performanceResult, advisorAnalysisResult] =
    await Promise.allSettled([
      apiFetch<PortfolioSummary>("/portfolio/summary", { headers }),
      apiFetch<PerformanceResponse>(
        "/portfolio/performance?range=6M&benchmark=IBOVESPA",
        { headers },
      ),
      apiFetch<AdvisorAnalysis>("/advisor/analysis/latest", { headers }),
    ]);

  const summary =
    summaryResult.status === "fulfilled" ? summaryResult.value : EMPTY_SUMMARY;
  const performance =
    performanceResult.status === "fulfilled"
      ? performanceResult.value
      : undefined;

  const { dayChange, dayChangePct } = deriveDayChange(performance?.series);

  // `404` is the expected response for a user with no analysis yet — start
  // idle, no notice. Any other rejection (e.g. `500`) still starts idle
  // (never blocks the rest of the dashboard) but surfaces an inline notice,
  // since that one is unexpected rather than a new-user default.
  let initialAnalysis: AdvisorAnalysis | undefined;
  let advisorLoadFailed = false;
  if (advisorAnalysisResult.status === "fulfilled") {
    initialAnalysis = advisorAnalysisResult.value;
  } else if (
    !(
      advisorAnalysisResult.reason instanceof ApiError &&
      advisorAnalysisResult.reason.status === 404
    )
  ) {
    advisorLoadFailed = true;
  }

  return (
    <>
      <PortfolioHeader
        userName={user?.name ?? user?.email ?? ""}
        currentValue={summary.currentValue}
        dayChange={dayChange}
        dayChangePct={dayChangePct}
      />
      <SummaryCards summary={summary} holdingsCount={0} />
      <AdvisorPanel
        initialAnalysis={initialAnalysis}
        initialLoadFailed={advisorLoadFailed}
      />
    </>
  );
}
