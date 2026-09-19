import { cookies } from "next/headers";

import { apiFetch, ApiError } from "../../lib/api-client";
import { PortfolioHeader } from "../../components/dashboard/PortfolioHeader";
import { SummaryCards } from "../../components/dashboard/SummaryCards";
import { AllocationDonut } from "../../components/dashboard/AllocationDonut";
import { AdvisorPanel } from "../../components/dashboard/advisor/AdvisorPanel";
import type {
  AdvisorAnalysis,
  AllocationSlice,
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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * "12 sectors" / "1 sector" — the donut's `centerSubLabel`. Trivial
 * pluralization (no irregular plurals in play for "sector"/"stock"), so a
 * plain `count === 1 ? singular : plural` is enough; not worth a shared
 * i18n pluralization utility for two call sites.
 */
function pluralizeCount(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

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
 * summary cards, allocation donuts, and `AdvisorPanel` from
 * `GET /portfolio/summary`, `GET /portfolio/performance`,
 * `GET /portfolio/allocation?by=sector`, `GET /portfolio/allocation?by=stock`,
 * and `GET /advisor/analysis/latest`. All five fetches are issued
 * concurrently (`Promise.allSettled`, not a sequential `await` each or a
 * plain `Promise.all`) so one endpoint's rejection degrades only its own
 * section instead of failing the whole page (US-4/US-5 still owe their own
 * fetches, inside this same `Promise.allSettled`).
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
 *
 * A rejected `/portfolio/allocation?by=sector` or `?by=stock` falls back to
 * an empty `slices` array, independently of the other — `AllocationDonut`
 * already renders its own empty state for that (see `US-3_T-1`), so this
 * never crashes the page. `by=investmentStyle`/`by=riskRating` are
 * supported by the endpoint and the component but deliberately not wired
 * here (see the story's notes) — a future two-line addition, not this
 * task's job. `investmentStyle`/`riskRating` donuts are also fed by the
 * same allocation slice count fallback (`0`), not shown at all in this pass.
 * A `null` classification arrives from the API already grouped under
 * `"Unclassified"` and is rendered like any other slice, not special-cased.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const headers = { Cookie: `${ACCESS_TOKEN_COOKIE}=${accessToken}` };

  const [
    summaryResult,
    performanceResult,
    advisorAnalysisResult,
    sectorAllocationResult,
    stockAllocationResult,
  ] = await Promise.allSettled([
    apiFetch<PortfolioSummary>("/portfolio/summary", { headers }),
    apiFetch<PerformanceResponse>(
      "/portfolio/performance?range=6M&benchmark=IBOVESPA",
      { headers },
    ),
    apiFetch<AdvisorAnalysis>("/advisor/analysis/latest", { headers }),
    apiFetch<AllocationSlice[]>("/portfolio/allocation?by=sector", {
      headers,
    }),
    apiFetch<AllocationSlice[]>("/portfolio/allocation?by=stock", {
      headers,
    }),
  ]);

  const summary =
    summaryResult.status === "fulfilled" ? summaryResult.value : EMPTY_SUMMARY;
  const performance =
    performanceResult.status === "fulfilled"
      ? performanceResult.value
      : undefined;

  const { dayChange, dayChangePct } = deriveDayChange(performance?.series);

  const sectorAllocation =
    sectorAllocationResult.status === "fulfilled"
      ? sectorAllocationResult.value
      : [];
  const stockAllocation =
    stockAllocationResult.status === "fulfilled"
      ? stockAllocationResult.value
      : [];

  const totalValueLabel = currencyFormatter.format(summary.currentValue);

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
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <AllocationDonut
          title="By sector"
          slices={sectorAllocation}
          centerLabel={totalValueLabel}
          centerSubLabel={pluralizeCount(sectorAllocation.length, "sector")}
        />
        <AllocationDonut
          title="By stock"
          slices={stockAllocation}
          centerLabel={totalValueLabel}
          centerSubLabel={pluralizeCount(stockAllocation.length, "stock")}
        />
      </div>
      <AdvisorPanel
        initialAnalysis={initialAnalysis}
        initialLoadFailed={advisorLoadFailed}
      />
    </>
  );
}
