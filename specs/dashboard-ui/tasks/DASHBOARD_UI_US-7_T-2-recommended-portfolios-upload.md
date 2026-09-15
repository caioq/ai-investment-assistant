# DASHBOARD_UI_US-7_T-2: `RecommendedPortfoliosUpload`

**Story:** [../stories/US-7-advisor-panel.md](../stories/US-7-advisor-panel.md)
**Status:** Not Started
**GitHub Issue:** #228 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-1, DASHBOARD_UI_SHARED_T-4

`apps/web/components/dashboard/advisor/RecommendedPortfoliosUpload.tsx` — a `'use client'` component uploading one wallet CSV at a time to `POST /advisor/recommended-portfolios/upload?wallet=DIVIDENDS|OVERALL_RECOMMENDED|SMALL_CAPS`, with optional `effectiveDate` and `sourceName` form fields.

**`wallet` is an explicit user choice, never inferred from the filename** — the [recommended-portfolios](../../recommended-portfolios/spec.md) spec says so directly, because guessing wrong files one wallet's recommendations under another and silently corrupts the advisor's prompt. Render it as a required select, with no default pre-selected: a pre-selected `DIVIDENDS` is a guess with extra steps.

- Show what's already loaded per wallet from `GET /advisor/recommended-portfolios/latest` (at most three entries, one per type), with each one's `effectiveDate` — so the user can tell whether their July upload is still the newest before spending an analysis on it.
- Uploads are additive history ([recommended-portfolios](../../recommended-portfolios/spec.md) `US-2`): re-uploading a wallet adds a snapshot rather than replacing one. Say so, so nobody hesitates to re-upload.
- Default `effectiveDate` to today (matching the API default) but let it be edited — a CSV exported last month has last month's date, and the advisor reasons over `effectiveDate`.

**Test:** `apps/web/components/dashboard/advisor/RecommendedPortfoliosUpload.test.tsx` (Vitest + RTL + `userEvent`, api client mocked): (1) submitting without choosing a wallet shows a validation error and fires **no** request; (2) choosing `SMALL_CAPS` and a file posts to the URL carrying `wallet=SMALL_CAPS` with the file in the `FormData`; (3) an edited `effectiveDate` is sent as a form field; (4) the stubbed `GET …/latest` renders one row per returned wallet with its `effectiveDate`; (5) the control is disabled while in flight.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
