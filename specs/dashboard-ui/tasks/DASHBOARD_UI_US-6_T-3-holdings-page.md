# DASHBOARD_UI_US-6_T-3: `/holdings` page

**Story:** [../stories/US-6-holdings-management.md](../stories/US-6-holdings-management.md)
**Status:** Not Started
**GitHub Issue:** #226 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-5, DASHBOARD_UI_US-6_T-1, DASHBOARD_UI_US-6_T-2

Create `apps/web/app/(dashboard)/holdings/page.tsx` — a Server Component inside the guarded `(dashboard)` group, composing `AddHoldingForm` and `HoldingsCsvUpload` with the current holdings list fetched from `GET /portfolio/holdings`.

Reuse `HoldingsGrid` (`US-5_T-2`) for the list rather than writing a second table. If `US-5_T-2` isn't merged when this is picked up, this task's `Depends on` says it isn't blocked on it — render the list with the grid if available, and don't build a parallel one if it isn't; coordinate rather than duplicate.

The page inherits the auth guard from the group's layout — it needs no check of its own, which is the point of putting the guard there.

**Test:** `apps/web/app/(dashboard)/holdings/page.test.tsx` (Vitest + RTL, api client stubbed): (1) renders both the add form and the CSV upload; (2) renders the current holdings from the stubbed response; (3) an empty holdings response still renders both input affordances — the page a new user lands on from the dashboard's empty state, where the list being empty is exactly why they're there.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
