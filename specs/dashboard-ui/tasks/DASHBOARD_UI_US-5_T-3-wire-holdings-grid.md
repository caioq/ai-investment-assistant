# DASHBOARD_UI_US-5_T-3: wire the holdings grid

**Story:** [../stories/US-5-holdings-grid.md](../stories/US-5-holdings-grid.md)
**Status:** Not Started
**GitHub Issue:** #223 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_US-2_T-3, DASHBOARD_UI_US-5_T-2

Add the holdings section to `apps/web/app/(dashboard)/page.tsx`: fetch `GET /portfolio/holdings` (joined with `Asset`, per the portfolio API contract) inside the page's existing `Promise.all` and render `HoldingsGrid` below the allocation/performance row, with a link to `/holdings` for adding more.

The mockup's holdings panel also carries a filter chip and a "No holdings match your filters" state driven by clicking an allocation slice. Client-side filtering isn't in this spec's Goals — render the unfiltered list. `HoldingsGrid` taking its rows as a prop means adding a filter later is a change to the page, not to the grid.

**Test:** extend `apps/web/app/(dashboard)/page.test.tsx`: (1) the grid renders a row per stubbed holding; (2) an empty `/portfolio/holdings` response renders the grid's empty state while the header and summary cards still render — the complete new-user dashboard, which is the state most likely to crash and the least likely to be opened manually during development.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
