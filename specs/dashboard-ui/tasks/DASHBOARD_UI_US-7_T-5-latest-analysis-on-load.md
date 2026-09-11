# DASHBOARD_UI_US-7_T-5: load the latest analysis and wire the panel

**Story:** [../stories/US-7-advisor-panel.md](../stories/US-7-advisor-panel.md)
**Status:** Not Started
**GitHub Issue:** #231 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_US-2_T-3, DASHBOARD_UI_US-7_T-4

Wire `AdvisorPanel` into `apps/web/app/(dashboard)/page.tsx` and seed it with `GET /advisor/analysis/latest`, so a previously generated report is on screen without spending API budget (spec Behavior Note).

- Fetch it **server-side**, in the page's existing `Promise.all`, and pass the result to `AdvisorPanel` as `initialAnalysis`. The spec says "on mount"; doing it on the server means the report is in the first paint rather than after a client round trip, and it's the same request either way.
- **`404` is the expected response for a new user, not an error.** The endpoint returns `404` when no analysis exists yet ([advisor](../../advisor/spec.md) API contract). Catch that one status and start the panel in `idle`; letting it propagate would take down the whole dashboard render for every user who hasn't clicked generate yet — and that's every user on their first visit.
- When an analysis does exist, the panel opens in `report` with it rendered; **"Ask Another Question" still returns to `idle`** and the stored analysis remains available server-side for the next load, since nothing was deleted (`US-7_T-4`).

**Test:** extend `apps/web/app/(dashboard)/page.test.tsx`: (1) a stubbed analysis renders the panel in its report state with that analysis's summary; (2) a `404` from `/advisor/analysis/latest` renders the panel in `idle` and the rest of the dashboard normally — no thrown error, no error boundary; (3) a `500` from the same endpoint also leaves the rest of the dashboard rendered, degrading to `idle` with an inline notice rather than taking the page down.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
