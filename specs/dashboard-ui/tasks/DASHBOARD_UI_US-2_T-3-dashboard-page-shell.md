# DASHBOARD_UI_US-2_T-3: dashboard page shell

**Story:** [../stories/US-2-portfolio-header-summary.md](../stories/US-2-portfolio-header-summary.md)
**Status:** Not Started
**GitHub Issue:** #214 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-5, DASHBOARD_UI_US-2_T-1, DASHBOARD_UI_US-2_T-2

Create `apps/web/app/(dashboard)/page.tsx` — the Server Component that fetches and composes the dashboard. This task establishes it with the header and summary cards; `US-3`, `US-4`, `US-5` and `US-7` each add their own section to the same file afterwards.

- Fetch `GET /portfolio/summary` and `GET /portfolio/performance?range=6M&benchmark=IBOVESPA` server-side through the api client, forwarding the request cookie via `cookies()`. Issue them **concurrently** with `Promise.all` — the dashboard ends up making five API calls, and awaiting them in sequence stacks five round trips into the server render.
- Derive `dayChange`/`dayChangePct` from the last two points of the performance series and pass them to `PortfolioHeader`; pass `null` when the series has fewer than two points (see `US-2_T-1`).
- A failing endpoint must degrade, not blank the page: render that section's empty state and keep the rest. One `500` from `/portfolio/performance` shouldn't cost the user their holdings view.

Because later tasks all edit this one file, they are deliberately *not* parallel with each other — the stories index says so explicitly.

**Test:** `apps/web/app/(dashboard)/page.test.tsx` (Vitest + RTL, api client stubbed): (1) renders `PortfolioHeader` and `SummaryCards` with values from the stubbed responses; (2) the two fetches are issued concurrently — assert both stubs were called before either promise resolved, using deferred promises rather than asserting on timing; (3) a rejected `/portfolio/performance` still renders the summary cards, with the header's daily change as an em-dash; (4) a two-point series yields the correct `dayChange` from the last two values. This file is extended, not replaced, by `SHARED_T-6`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
