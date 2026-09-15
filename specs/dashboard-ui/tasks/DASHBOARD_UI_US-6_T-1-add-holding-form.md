# DASHBOARD_UI_US-6_T-1: manual add-holding form

**Story:** [../stories/US-6-holdings-management.md](../stories/US-6-holdings-management.md)
**Status:** Not Started
**GitHub Issue:** #224 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-1, DASHBOARD_UI_SHARED_T-4

`apps/web/components/holdings/AddHoldingForm.tsx` — a `'use client'` form posting `{ ticker, quantity, avgPrice }` to `POST /portfolio/holdings`, which creates the `Asset` row when the ticker is new.

- Upper-case the ticker on submit. B3 tickers are stored upper-case, and `petr4` typed in lower case would otherwise create a second `Asset` for a ticker that already exists.
- `quantity` and `avgPrice` are numbers: send them as numbers, not the input's strings, and reject a negative or zero quantity client-side with an inline message.
- Disable submit while in flight (the same double-submit guard as the auth forms — here a double-click creates two holdings, not just two requests).
- On success, clear the form and refresh the list via `router.refresh()` so the server-rendered holdings re-fetch. Don't hand-patch a local array; that state then disagrees with the dashboard's own copy.
- Surface the API's validation error inline rather than as a generic banner — a rejected ticker is the common case here and the user needs to know which field to fix.

**Test:** `apps/web/components/holdings/AddHoldingForm.test.tsx` (Vitest + RTL + `userEvent`, api client and `useRouter` mocked): (1) a valid submission posts `{ ticker: 'PETR4', quantity: 100, avgPrice: 32.5 }` — ticker upper-cased, both numerics as `number` not `string` — from lower-case, string-typed input; (2) a zero or negative quantity shows an inline error and fires **no** request; (3) submit is disabled while in flight; (4) a successful submission clears the fields and calls `router.refresh()`; (5) a `400` renders the API's message inline.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
