# DASHBOARD_UI_US-1_T-4: `LogoutButton`

**Story:** [../stories/US-1-auth-pages.md](../stories/US-1-auth-pages.md)
**Status:** Done
**GitHub Issue:** #233 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DASHBOARD_UI_SHARED_T-1, DASHBOARD_UI_SHARED_T-5

`apps/web/components/auth/LogoutButton.tsx` — a `'use client'` control in the `(dashboard)` shell's sidebar, calling `POST /auth/logout` and then navigating to `/login`.

**The request is the logout, not the redirect.** `access_token` is httpOnly, so JavaScript cannot clear it; only the server's `Set-Cookie` does. A client-side `router.push('/login')` without the request leaves a fully valid session cookie in the browser — the user appears logged out and is not. The test asserts the request fires, for exactly this reason.

- `POST /auth/logout` returns `204`; the api client already resolves that to `undefined` rather than choking on an empty body (`SHARED_T-1`).
- Use `router.replace('/login')`, not `push` — Back must not return to a dashboard route that now renders nothing. Follow it with `router.refresh()` so the App Router's cached server render for the authenticated tree is discarded.
- Disable the button while in flight.
- **A failed request still logs out locally.** If the call rejects (server down, network gone), redirect anyway and surface a brief notice: leaving the user parked on an authenticated screen because logout failed is the worse outcome, especially on a shared machine. The cookie survives server-side, but the next guarded navigation re-validates against an API that is by then reachable or not.

**Test:** `apps/web/components/auth/LogoutButton.test.tsx` (Vitest + RTL + `userEvent`, api client and `useRouter` mocked): (1) clicking calls `POST /auth/logout` **before** navigating — assert call order, not just that both happened; (2) after resolution it calls `router.replace('/login')`, not `push`; (3) the button is disabled while in flight and a second click issues no second request; (4) a rejected request still navigates to `/login`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
