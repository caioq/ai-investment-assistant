# DASHBOARD_UI_US-7_T-1: `AdvisorReportUpload`

**Story:** [../stories/US-7-advisor-panel.md](../stories/US-7-advisor-panel.md)
**Status:** Not Started
**GitHub Issue:** #227 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-1, DASHBOARD_UI_SHARED_T-4

`apps/web/components/dashboard/advisor/AdvisorReportUpload.tsx` — a `'use client'` component feeding the research house's report to `POST /advisor/reports/upload`, which accepts **either** a multipart PDF **or** a JSON `{ sourceName?, text }`.

Offer both in one component with a PDF/paste toggle, and branch on which the user chose: multipart via the api client's `FormData` helper for the file, plain JSON for the pasted text. Two separate components would duplicate the same success/error handling around a one-line difference.

- On success, surface the created report's identity (`sourceName`/`fileName`) and hand its `id` up via an `onUploaded(report)` callback — `AdvisorPanel` passes it to `POST /advisor/analyze` as `advisorReportId`.
- Uploading a report is **optional**: `POST /advisor/analyze` succeeds without one (an explicit advisor spec AC). Word the UI as "add a report for extra context", not as a required step, or users will believe the advisor is blocked until they find a PDF.
- PDFs run large. Disable the control while uploading and show progress-ish feedback; a 5MB upload with a dead button reads as a broken page.

**Test:** `apps/web/components/dashboard/advisor/AdvisorReportUpload.test.tsx` (Vitest + RTL + `userEvent`, api client mocked): (1) the PDF path sends `FormData` containing the file; (2) the paste path sends a JSON body with the entered `text`; (3) a successful upload invokes `onUploaded` with the created report; (4) the control is disabled while in flight; (5) a rejected upload renders an error and does **not** invoke `onUploaded`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
