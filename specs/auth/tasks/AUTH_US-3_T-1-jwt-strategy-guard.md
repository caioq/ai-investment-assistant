# AUTH_US-3_T-1: passport-jwt strategy, cookie extractor, AuthGuard

**Story:** [../stories/US-3-guarded-session.md](../stories/US-3-guarded-session.md)
**Status:** Done
**GitHub Issue:** #41 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** AUTH_US-1_T-3

Register the `cookie-parser` middleware in `apps/api/src/main.ts` (`app.use(cookieParser())`) so `req.cookies` is populated. Add a `JwtStrategy` (`apps/api/src/auth/jwt.strategy.ts`, `passport-jwt`) with a custom extractor function that pulls the token from `req.cookies.access_token` (not the `Authorization` header), per spec Behavior Notes. Add `AuthGuard` (`apps/api/src/auth/auth.guard.ts`) extending `@nestjs/passport`'s `AuthGuard('jwt')` — this is the shared guard every controller in every module uses going forward, per `CONVENTIONS.md` → "Auth", resolving `req.user.id` from the strategy's `validate()` return value.

**Test:** `apps/api/src/auth/jwt.strategy.spec.ts` — unit test on the cookie-extractor function in isolation: given a mock request object with `cookies: { access_token: 'xyz' }`, it returns `'xyz'`; given a request with no `access_token` cookie, it returns `null` (so passport falls through to a 401, never reading a bearer token). Confirm red first (no extractor exists), then green after implementing.

**Done when:** the test above passes. (The full middleware + guard wiring, including `cookie-parser` actually populating `req.cookies` on a real request, is proven end-to-end by [AUTH_US-3_T-2](./AUTH_US-3_T-2-me-endpoint.md)'s e2e test.)
