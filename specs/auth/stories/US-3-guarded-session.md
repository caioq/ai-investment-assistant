# US-3: Guarded session

**Status:** Ready
**Traces to:** spec Goal "Every other module's endpoints are guarded and scoped to the authenticated user." / AC "After login, `GET /auth/me` returns the current user using only the cookie (no bearer token)." / AC "Hitting any protected endpoint (e.g. `GET /portfolio/holdings`) without the cookie returns 401." / AC "`POST /auth/logout` clears the cookie; a subsequent `GET /auth/me` returns 401." (in `../spec.md`)

As a logged-in user, I want my session verified via a secure cookie on every request, so my data stays private and future endpoints can trust `req.user.id` without re-checking credentials themselves.

## Tasks

- [x] [T-1: passport-jwt strategy, cookie extractor, AuthGuard](../tasks/AUTH_US-3_T-1-jwt-strategy-guard.md)
- [x] [T-2: GET /auth/me endpoint](../tasks/AUTH_US-3_T-2-me-endpoint.md)
- [ ] [T-3: POST /auth/logout endpoint](../tasks/AUTH_US-3_T-3-logout-endpoint.md)

## Notes

The spec's protected-endpoint example is `GET /portfolio/holdings`, which doesn't exist yet (the `portfolio` module hasn't been broken into stories/tasks). This story proves the guard behavior using `GET /auth/me` — the only protected route that exists at this point in the build — as the concrete stand-in. `AuthGuard` (`apps/api/src/auth/auth.guard.ts`) is written to be reused as-is by every later module's controllers, per `CONVENTIONS.md` → "Auth"; wiring it into `portfolio`/`market-data`/`advisor` controllers is each of those modules' own responsibility when their turn comes.
