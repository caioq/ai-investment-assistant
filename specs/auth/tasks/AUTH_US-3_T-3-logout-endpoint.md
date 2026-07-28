# AUTH_US-3_T-3: POST /auth/logout endpoint

**Story:** [../stories/US-3-guarded-session.md](../stories/US-3-guarded-session.md)
**Status:** Not Started
**GitHub Issue:** #43 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_US-3_T-2

Add `POST /auth/logout`, guarded with `AuthGuard` (per spec API Contract, requires auth), that clears the `access_token` cookie (`res.clearCookie('access_token', { httpOnly: true, sameSite: 'lax', secure: isProd })` — flags must match how it was set, or the browser won't clear it) and returns `204`.

**Test:** `apps/api/test/auth.e2e-spec.ts` (extends the file from `US-3_T-2`) — e2e test: register + login to get a valid `access_token` cookie, `POST /auth/logout` with that cookie returns `204` with a `Set-Cookie` header that expires/clears `access_token`, then a subsequent `GET /auth/me` using the (now-cleared) cookie jar returns `401`. Confirm red first (no `/auth/logout` route exists, so the request 404s), then green after implementing.

**Done when:** the test above passes.
