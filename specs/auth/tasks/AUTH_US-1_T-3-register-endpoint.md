# AUTH_US-1_T-3: POST /auth/register endpoint

**Story:** [../stories/US-1-registration.md](../stories/US-1-registration.md)
**Status:** Not Started
**GitHub Issue:** #38 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_US-1_T-2, AUTH_SHARED_T-2

Add `POST /auth/register` per the spec's API Contract: `RegisterDto` (`email`, `password`, `name?`) validated by the global `ValidationPipe` (per `CONVENTIONS.md`). On success, call `AuthService.register`, sign a JWT with `JwtModule` (configured with `JWT_SECRET` from env; add it to `apps/api/.env.example`), set it on an `access_token` cookie with the flags from spec Behavior Notes (`httpOnly: true`, `sameSite: 'lax'`, `secure: isProd`), and return `{ id, email, name }`. Extract the sign+set-cookie logic into a method on `AuthService` (e.g. `issueSession(res, user)`) so [AUTH_US-2_T-2](./AUTH_US-2_T-2-login-endpoint.md)'s login endpoint can reuse it rather than duplicating it.

**Test:** `apps/api/test/auth.e2e-spec.ts` — e2e test (per the pattern in `apps/api/test/health.e2e-spec.ts`, against a real Nest app + `db-test`): (1) `POST /auth/register` with a new email returns `201`/`200` with a `Set-Cookie: access_token=...` header and a body of exactly `{ id, email, name }` (no `passwordHash` field); (2) registering the same email again returns a `4xx` status (not `500`, not a duplicate row in `users`). Confirm red first (no `/auth/register` route exists, so the request 404s), then green after implementing.

**Done when:** the test above passes.
