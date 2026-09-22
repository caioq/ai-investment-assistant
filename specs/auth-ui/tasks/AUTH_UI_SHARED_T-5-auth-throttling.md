# AUTH_UI_SHARED_T-5: Per-IP throttling on `POST /auth/login` and `/auth/register`

**Shared by:** US-1, US-2
**Status:** Done
**GitHub Issue:** #277 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add `@nestjs/throttler` to `apps/api` and throttle **only** `POST /auth/login` and `POST /auth/register`, per client IP. The limit comes from `AUTH_THROTTLE_LIMIT` (default `5`) and the window from `AUTH_THROTTLE_TTL_MS` (default `60000`), read at module init. An exceeded limit returns `429`. `GET /auth/me`, `POST /auth/logout` and every non-auth endpoint stay unthrottled (see [auth spec](../../auth/spec.md) → "Amended by auth-ui").

Because the API and Playwright e2e suites register and log in many users from one IP, set `AUTH_THROTTLE_LIMIT=1000` in the following places. Document the variable in `.env.example`.
- `.github/workflows/ci.yml` job env
- `apps/web/playwright.config.ts`'s API `webServer` env
- the local e2e instructions in CONVENTIONS.md → "Testing"

**Test:** a new file, `apps/api/test/auth-throttle.e2e-spec.ts`, using a real `AppModule` plus `configureApp(app)`, with `process.env.AUTH_THROTTLE_LIMIT = '5'` and `AUTH_THROTTLE_TTL_MS = '60000'` set before `createTestingModule`. Jest runs each e2e file in its own worker, so this doesn't leak into other suites. It asserts:
1. Five `POST /auth/login` requests with wrong credentials each return `401`, and the 6th returns `429`.
2. After the limit is hit, `GET /auth/me` without a cookie still returns `401`, not `429`.
3. A 6th `POST /auth/register` in a fresh app instance returns `429`.

Clean up any users created, scoped by email (CONVENTIONS.md → "Testing").

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes. The full `pnpm --filter api test:e2e` must also still pass with the raised limit.
