# AUTH_US-3_T-2: GET /auth/me endpoint

**Story:** [../stories/US-3-guarded-session.md](../stories/US-3-guarded-session.md)
**Status:** Done
**GitHub Issue:** #42 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_US-3_T-1, AUTH_US-2_T-2

Add `GET /auth/me`, guarded with `AuthGuard`, returning `{ id, email, name }` for `req.user.id` (looked up via `PrismaService`, no `passwordHash` in the response).

**Test:** `apps/api/test/auth.e2e-spec.ts` (extends the file from `AUTH_US-2_T-2`) — e2e test: (1) `GET /auth/me` with no cookie returns `401` — this is the concrete instance of the spec's AC "hitting any protected endpoint without the cookie returns 401", using `/auth/me` since `/portfolio/holdings` doesn't exist yet; (2) registering then logging in, then calling `GET /auth/me` with **only** the `Set-Cookie` from login forwarded (no `Authorization` header set) returns `200` with `{ id, email, name }` matching the registered user, no `passwordHash` field. Confirm red first (no `/auth/me` route exists, so both requests 404 rather than 401/200), then green after implementing.

**Done when:** the test above passes.
