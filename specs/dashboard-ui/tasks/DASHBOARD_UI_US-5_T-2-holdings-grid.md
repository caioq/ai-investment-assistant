# DASHBOARD_UI_US-5_T-2: `HoldingsGrid`

**Story:** [../stories/US-5-holdings-grid.md](../stories/US-5-holdings-grid.md)
**Status:** Not Started
**GitHub Issue:** #222 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_US-5_T-1

`apps/web/components/dashboard/HoldingsGrid.tsx` — the holdings panel: a header row, one `HoldingCard` per holding sorted by market value descending, and a footer count.

Use a real `<table>` with `<th scope="col">` headers, not a grid of `<div>`s. It is tabular data; the semantic markup is what gives screen readers column context and what lets the browser's own find-in-page work across a 31-row portfolio.

Sorting by market value puts unpriced holdings (`currentPrice: null`, so no computable value) at the end rather than at the top — a `null` compared numerically sorts unpredictably and can park the broken rows above everything.

The empty state is the new-user path and gets a real message plus a link to `/holdings`, not a blank panel: this is the first screen a registered user with no data sees.

**Test:** `apps/web/components/dashboard/HoldingsGrid.test.tsx` (Vitest + RTL): (1) renders one row per holding within a `<table>` carrying column headers; (2) rows appear in descending market-value order; (3) a holding with a `null` `currentPrice` sorts last rather than first; (4) an empty array renders the empty-state message with a link to `/holdings` and no table body rows; (5) the footer reports the correct count.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
