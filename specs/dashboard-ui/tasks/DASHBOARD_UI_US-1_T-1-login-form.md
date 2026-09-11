# DASHBOARD_UI_US-1_T-1: `LoginForm`

**Story:** [../stories/US-1-auth-pages.md](../stories/US-1-auth-pages.md)
**Status:** Not Started
**GitHub Issue:** #209 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-1, DASHBOARD_UI_SHARED_T-4

`apps/web/components/auth/LoginForm.tsx` — a `'use client'` component posting `{ email, password }` to `POST /auth/login` through the api client, then `router.push('/')` on success.

- The submit button is `disabled` while the request is in flight, so a double-click can't fire two logins.
- A `401` renders an inline error. Use one generic message for both a wrong password and an unknown email — distinguishing them turns the form into an account-enumeration oracle.
- Any other failure (network, `500`) renders a distinct "something went wrong" message, so a server outage doesn't read to the user as a wrong password.
- No token handling in JS: the API sets the httpOnly `access_token` cookie itself, and the api client's `credentials: 'include'` is what persists it.

**Test:** `apps/web/components/auth/LoginForm.test.tsx` (Vitest + RTL, api client and `next/navigation`'s `useRouter` mocked): (1) filling both fields and submitting calls the client with the entered email and password; (2) the button is disabled while the promise is pending and re-enabled after it rejects; (3) a `401` `ApiError` renders the generic error message and does **not** navigate; (4) a resolved login calls `router.push('/')`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
