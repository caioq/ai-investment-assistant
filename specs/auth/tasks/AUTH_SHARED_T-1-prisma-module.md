# AUTH_SHARED_T-1: PrismaModule + PrismaService

**Shared by:** US-1, US-2
**Status:** Not Started
**GitHub Issue:** #34 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add a global `PrismaModule` at `apps/api/src/prisma/` wrapping a `PrismaService` (extends the generated `PrismaClient`, connects in `onModuleInit`, disconnects in `onModuleDestroy`), per `CONVENTIONS.md` → "Module structure". This is the first task in the repo that needs real DB access from application code (`apps/api/prisma/schema.prisma` currently has only `datasource`/`generator` blocks, no consuming service) — every later service in this module (and future modules) injects `PrismaService` via constructor DI instead of instantiating `PrismaClient` directly.

**Test:** `apps/api/test/prisma.e2e-spec.ts` — boots a `Test.createTestingModule({ imports: [PrismaModule] }).compile()` Nest testing module (per the e2e pattern in `apps/api/test/health.e2e-spec.ts`), injects `PrismaService`, and asserts `prismaService.$queryRaw\`SELECT 1\`` resolves against the `db-test` Postgres service from `docker-compose.yml`. Confirm red first (no `PrismaModule` exists, so the import fails), then green after implementing.

**Done when:** the test above passes with `db-test` running, and `PrismaService` is registered as a global provider so downstream modules don't need to re-import `PrismaModule` explicitly.
