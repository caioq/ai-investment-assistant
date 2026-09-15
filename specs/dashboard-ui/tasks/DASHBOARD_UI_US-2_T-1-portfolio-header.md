# DASHBOARD_UI_US-2_T-1: `PortfolioHeader`

**Story:** [../stories/US-2-portfolio-header-summary.md](../stories/US-2-portfolio-header-summary.md)
**Status:** Not Started
**GitHub Issue:** #212 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-2, DASHBOARD_UI_SHARED_T-4

`apps/web/components/dashboard/PortfolioHeader.tsx` — the navy gradient hero from the mockup (lines 66–110): greeting, total portfolio value, and the daily-change pill.

Presentational only: it takes `{ userName, currentValue, dayChange, dayChangePct }` as props and renders them. The page fetches; this component does not.

**`GET /portfolio/summary` does not return a daily change.** Its contract is `{ totalInvested, currentValue, gainLoss, returnPct }` — there is no `dayChange` field anywhere in the [portfolio](../../portfolio/spec.md) API. Until that spec grows one, `US-2_T-3` derives it from the last two points of `GET /portfolio/performance` (`value[n] - value[n-1]`) and passes it in. Consequences this component has to handle, and which its test pins:
- A series with **fewer than two points** — a brand-new portfolio, or one whose first snapshot ran today — has no daily change at all. Render an em-dash, not `0` and not `NaN`; "flat today" and "no data yet" are different statements.
- Snapshots are weekday-only, so "since the previous snapshot" is Friday→Monday over a weekend. Label the pill "since last close", not "today", so the number isn't read as intraday.

Format currency as BRL (`Intl.NumberFormat('pt-BR')`) — this is a B3 portfolio.

The mockup's hero also shows a **"Cash available"** figure. There is no cash concept anywhere in the backend; omit it rather than rendering a hard-coded zero.

**Test:** `apps/web/components/dashboard/PortfolioHeader.test.tsx` (Vitest + RTL): (1) renders the formatted BRL total and the user's name; (2) a positive `dayChange` renders the positive-tone badge with an up indicator, a negative one the negative tone; (3) `dayChange` of `null` renders an em-dash and **no** badge tone, and the rendered output contains neither `NaN` nor `R$ 0,00`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
