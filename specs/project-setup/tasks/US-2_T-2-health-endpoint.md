# T-2 (US-2): GET /health endpoint

**Story:** [../stories/US-2-backend-health-check-skeleton.md](../stories/US-2-backend-health-check-skeleton.md)
**Status:** Not Started
**GitHub Issue:** #5 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)

Add a `HealthController` (`apps/api/src/health/health.controller.ts`) registered in `AppModule`, exposing `GET /health` that returns HTTP `200` with body `{ status: "ok" }`, per the spec's API Contract table. No auth, no dependencies on Prisma/Postgres.

**Test:** `apps/api/test/health.e2e-spec.ts` — using `supertest` against a real Nest application instance (per `CONVENTIONS.md`'s e2e testing convention), `GET /health` asserts response status `200` and body deep-equals `{ status: "ok" }`.

**Done when:** that test passes red-green (write it first, confirm it fails because `HealthController` doesn't exist yet, then implement until it passes).
