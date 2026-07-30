# AUTH_SHARED_T-2: CORS bootstrap for cookie auth

**Shared by:** US-1, US-2, US-3
**Status:** Done
**GitHub Issue:** #35 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

In `apps/api/src/main.ts`, call `app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true })`, per spec Behavior Notes ("CORS configured with `{ origin: FRONTEND_URL, credentials: true }` so the browser sends the cookie cross-port in dev"). Add `FRONTEND_URL` to `apps/api/.env.example` (see `packages/shared`/`.env.example` conventions from `US-1_T-3` in `project-setup`) defaulting to `http://localhost:3000`.

**Test:** `apps/api/test/cors.e2e-spec.ts` — sends a `GET /health` request (existing, unauthenticated endpoint) with an `Origin: http://localhost:3000` header, and asserts the response has `access-control-allow-origin: http://localhost:3000` and `access-control-allow-credentials: true` headers. Confirm red first (no CORS configured, so the headers are absent), then green after adding `enableCors`.

**Done when:** the test above passes.
