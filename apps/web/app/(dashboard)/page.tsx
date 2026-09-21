import Link from "next/link";
import { cookies } from "next/headers";

import { apiFetch, ApiError } from "../../lib/api-client";
import { PortfolioHeader } from "../../components/dashboard/PortfolioHeader";
import { SummaryCards } from "../../components/dashboard/SummaryCards";
import { AllocationDonut } from "../../components/dashboard/AllocationDonut";
import { PerformanceRange } from "../../components/dashboard/PerformanceRange";
import { HoldingsGrid } from "../../components/dashboard/HoldingsGrid";
import { AdvisorPanel } from "../../components/dashboard/advisor/AdvisorPanel";
import type {
  AdvisorAnalysis,
  AllocationSlice,
  HoldingWithAsset,
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
 * summary cards, allocation donuts, the performance section, the holdings
 * grid, and `AdvisorPanel` from `GET /portfolio/summary`,
 * `GET /portfolio/performance`, `GET /portfolio/allocation?by=sector`,
 * `GET /portfolio/allocation?by=stock`, `GET /portfolio/holdings`, and
 * `GET /advisor/analysis/latest`. All six fetches are issued concurrently
 * (`Promise.allSettled`, not a sequential `await` each or a plain
 * `Promise.all`) so one endpoint's rejection degrades only its own section
 * instead of failing the whole page.
 *
 * A rejected `GET /portfolio/holdings` falls back to an empty array —
 * `HoldingsGrid` already renders its own empty state for that (see
 * `US-5_T-2`), so a holdings-fetch failure never takes down the rest of the
 * dashboard. No client-side filtering is applied to the list (out of scope,
 * see the story's notes); the page just renders whatever the fetch (or its
 * empty fallback) returns.
 *
 * A rejected `/portfolio/performance` degrades rather than blanking the
 * page: the summary cards still render from a successful `/portfolio/summary`,
 * with the header's daily change falling back to `null` (an em-dash), and the
 * performance section (`PerformanceRange` + its child `PerformanceMetrics`)
 * simply isn't rendered at all rather than being handed an empty stand-in —
 * `PerformanceRange`'s `initialData` prop is a real `PerformanceResponse`,
 * not an optional one, since there's no meaningful "empty" performance series
 * to seed a chart with. The single `6M` fetch here is also what seeds
 * `PerformanceRange` (`US-4_T-4`) — it is deliberately not fetched a second
 * time for the chart; see `PerformanceRange`'s own doc comment for how it
 * re-fetches on a range change without a second initial request.
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
    holdingsResult,
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
    apiFetch<HoldingWithAsset[]>("/portfolio/holdings", { headers }),
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
  const holdings =
    holdingsResult.status === "fulfilled" ? holdingsResult.value : [];

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
      <SummaryCards summary={summary} holdingsCount={holdings.length} />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", flex: 1 }}>
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
        {performance ? (
          <div style={{ flex: 1, minWidth: 320 }}>
            <PerformanceRange initialData={performance} benchmark="IBOVESPA" />
          </div>
        ) : null}
      </div>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 8,
          }}
        >
          <Link href="/holdings" style={{ color: "var(--blue)", fontWeight: 600 }}>
            Add holdings
          </Link>
        </div>
        <HoldingsGrid holdings={holdings} />
      </div>
      <AdvisorPanel
        initialAnalysis={initialAnalysis}
        initialLoadFailed={advisorLoadFailed}
      />
    </>
  );
}
