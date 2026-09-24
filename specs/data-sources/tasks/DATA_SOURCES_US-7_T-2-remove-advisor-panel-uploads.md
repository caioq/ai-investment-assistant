# DATA_SOURCES_US-7_T-2: Remove the advisor panel uploads

**Story:** [../stories/US-7-retire-old-upload-ui.md](../stories/US-7-retire-old-upload-ui.md)
**Status:** Done
**GitHub Issue:** #327 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_US-4_T-2, DATA_SOURCES_US-5_T-2

Delete `apps/web/components/dashboard/advisor/AdvisorReportUpload.tsx` and `RecommendedPortfoliosUpload.tsx` with their tests, and remove them from `AdvisorPanel`, which keeps only its analysis, the "Generate Portfolio Analysis" button and its existing `idle → loading → report | error` state machine.

`AdvisorPanel` currently threads the uploaded report's id into `POST /advisor/analyze` via `advisorReportId`. With the upload gone, the panel no longer has one to pass, so it posts `{}` and the API uses the user's most recent report — matching spec → Import effects ("the advisor uses the most recent one"). Drop the now-dead `advisorReportId` state rather than leaving it permanently `undefined`.

Update CONVENTIONS.md → "One component, two request-body shapes" and "Required select with no default", both of which document these two components as reference patterns.

**Test:** `apps/web/components/dashboard/advisor/AdvisorPanel.test.tsx` (update the existing file):
1. The panel renders the Generate button and the analysis, and renders no file input, no wallet select and no paste-text control.
2. Clicking Generate posts to `/advisor/analyze` with an empty body — no `advisorReportId` key.
3. The existing state-machine cases (loading, error, "Ask Another Question", the re-entry guard) still pass.

Plus: `grep -rn "AdvisorReportUpload\|RecommendedPortfoliosUpload" apps/web` returns nothing.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
