# AUTH_US-2_T-2: POST /auth/login endpoint

**Story:** [../stories/US-2-login.md](../stories/US-2-login.md)
**Status:** Done
**GitHub Issue:** #40 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_US-2_T-1, AUTH_US-1_T-3

Add `POST /auth/login` per the spec's API Contract: `LoginDto` (`email`, `password`). On success, call `AuthService.validateUser`, then reuse the `issueSession` (sign JWT + set `access_token` cookie) logic from [AUTH_US-1_T-3](./AUTH_US-1_T-3-register-endpoint.md) and return `{ id, email, name }`. On failure, return `401` and do not set any cookie.

**Test:** `apps/api/test/auth.e2e-spec.ts` (extends the file from `AUTH_US-1_T-3`) — e2e test: (1) registering a user then `POST /auth/login` with the correct credentials returns `200` with a `Set-Cookie: access_token=...` header and `{ id, email, name }` (no `passwordHash`); (2) `POST /auth/login` with a wrong password (or an email that was never registered) returns `401` with **no** `Set-Cookie` header in the response. Confirm red first (no `/auth/login` route exists, so the request 404s), then green after implementing.

**Done when:** the test above passes.
