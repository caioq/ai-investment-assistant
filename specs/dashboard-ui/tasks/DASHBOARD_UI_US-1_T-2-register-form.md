# DASHBOARD_UI_US-1_T-2: `RegisterForm`

**Story:** [../stories/US-1-auth-pages.md](../stories/US-1-auth-pages.md)
**Status:** Not Started
**GitHub Issue:** #210 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-1, DASHBOARD_UI_SHARED_T-4

`apps/web/components/auth/RegisterForm.tsx` — a `'use client'` component posting `{ email, password, name? }` to `POST /auth/register`, then `router.push('/')`. `name` is optional in the auth spec's contract, so send it only when non-empty rather than as `""`.

- Same in-flight disable and generic-network-error handling as `LoginForm`.
- A `409` (email already registered) renders a field-level error on the email input with a link to `/login`, not a generic banner — this is the one auth error where telling the user exactly what happened is the helpful move and enumeration is moot, since they're the one choosing the address.
- Mirror whatever password rule the auth spec states; don't invent a stricter client-side rule than the API enforces, or a valid password gets rejected before it's ever sent.

**Test:** `apps/web/components/auth/RegisterForm.test.tsx` (Vitest + RTL, api client and `useRouter` mocked): (1) submitting with a blank name omits `name` from the request body entirely rather than sending `""`; (2) a `409` renders the "already registered" error with a link to `/login`; (3) the button is disabled while in flight; (4) a resolved register calls `router.push('/')`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
