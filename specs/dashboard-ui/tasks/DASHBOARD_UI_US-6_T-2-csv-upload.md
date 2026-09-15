# DASHBOARD_UI_US-6_T-2: holdings CSV upload with per-row feedback

**Story:** [../stories/US-6-holdings-management.md](../stories/US-6-holdings-management.md)
**Status:** Not Started
**GitHub Issue:** #225 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-1, DASHBOARD_UI_SHARED_T-4

`apps/web/components/holdings/HoldingsCsvUpload.tsx` — a `'use client'` component posting a multipart CSV to `POST /portfolio/holdings/upload-csv` and rendering the `{ created, updated, errors[] }` response (spec AC: "shows per-row success/error feedback matching the backend's response").

- Send via the api client's multipart helper with the `FormData`; never hand-set `Content-Type` (see `SHARED_T-1`).
- Render the outcome as three distinct facts, not one number: **N created**, **N updated**, and **every entry in `errors[]` listed individually** with its row identifier and message. A partial import that reports only "12 imported" hides the three rows that silently didn't.
- `errors[]` being non-empty alongside a non-zero `created` is the **normal** case for a real broker export, not a failure — render it as a partial success with the errors expanded, not as an error state that implies nothing was saved.
- Disable the input while uploading; `router.refresh()` afterwards so the list reflects the import.
- Accept `.csv` via the file input's `accept`, but don't validate the file's contents client-side. The backend resolves columns by header name (`Ticker`, `Quantidade`, `Preco Médio`) and ignores the rest; a frontend pre-check would be a second, drifting parser.

**Test:** `apps/web/components/holdings/HoldingsCsvUpload.test.tsx` (Vitest + RTL + `userEvent`, api client mocked): (1) selecting a file and submitting sends a `FormData` with the file and no explicit `Content-Type`; (2) a `{ created: 12, updated: 3, errors: [] }` response renders both counts and no error list; (3) a `{ created: 9, updated: 0, errors: [2 entries] }` response renders **both** the success count and both error entries with their messages — the partial-import case the AC is really about; (4) the input is disabled while in flight; (5) a rejected upload renders an error and leaves the input usable for a retry.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
