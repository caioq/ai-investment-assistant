# DASHBOARD_UI_US-7_T-4: `AdvisorPanel` state machine

**Story:** [../stories/US-7-advisor-panel.md](../stories/US-7-advisor-panel.md)
**Status:** Not Started
**GitHub Issue:** #230 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_US-7_T-1, DASHBOARD_UI_US-7_T-2, DASHBOARD_UI_US-7_T-3

`apps/web/components/dashboard/advisor/AdvisorPanel.tsx` — the `'use client'` component owning the panel's state machine, exactly as the spec's Behavior Notes define it:

`idle` → (click **Generate Portfolio Analysis**) → `loading` → `report` | `error`

- In `idle` it renders `AdvisorReportUpload` and `RecommendedPortfoliosUpload` plus the generate button; in `report` it renders `AdvisorAnalysisResult`.
- **The generate button is disabled for the entire duration of the in-flight request** — this is its own spec AC ("the `loading` state can't be triggered twice concurrently"), and it matters more here than anywhere else in the app: each click is a paid Claude call. Disable the button *and* guard the handler against re-entry, since a button can be re-triggered by keyboard while the pointer is elsewhere.
- `POST /advisor/analyze` takes an optional `advisorReportId`. Pass the one `AdvisorReportUpload` reported if a report was uploaded this session; omit it otherwise. The call succeeds either way — an explicit advisor spec AC.
- **"Ask Another Question" returns to `idle` without deleting the persisted analysis** (spec Behavior Note). It's a local state transition only: no `DELETE`, no clearing the last result from memory, so re-opening the panel or reloading still shows it via `US-7_T-5`.
- The `error` state shows the failure and offers a retry that goes back through `loading` — a schema-invalid model response is retried once server-side and then surfaced as a real error (advisor spec), so this state is reachable in normal use, not only on a network fault.

Analysis takes tens of seconds. Render a determinate-feeling `loading` state that says what's happening; a bare spinner on a 40-second wait gets read as a hang and clicked again.

**Test:** `apps/web/components/dashboard/advisor/AdvisorPanel.test.tsx` (Vitest + RTL + `userEvent`, api client mocked with deferred promises): (1) initial state is `idle` with the uploads and the generate button; (2) clicking generate enters `loading` and renders the result on resolution; (3) **the button is disabled while in flight, and a second click during `loading` issues no second request** — assert the mock's call count is exactly `1`, which is the spec AC; (4) with a report uploaded first, the analyze call carries that `advisorReportId`; without one, the body omits it entirely; (5) a rejected analyze enters `error` and the retry re-issues the request; (6) "Ask Another Question" returns to `idle`, fires **no** `DELETE`, and the previously received analysis is still held in state.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
