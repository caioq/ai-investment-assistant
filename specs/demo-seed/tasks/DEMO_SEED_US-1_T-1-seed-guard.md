# DEMO_SEED_US-1_T-1: `assertSeedAllowed` environment guard

**Story:** [../stories/US-1-never-damage-real-data.md](../stories/US-1-never-damage-real-data.md)
**Status:** Not Started
**GitHub Issue:** #359 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Create `apps/api/prisma/seed/guard.ts`, exporting a pure `assertSeedAllowed(env: NodeJS.ProcessEnv): void` with no Prisma import. It throws an `Error` whose message names the rule that was broken when:
- `env.NODE_ENV === 'production'`. This can't be overridden.
- `env.DATABASE_URL` is missing or `new URL()` can't parse it.
- The URL's `hostname` isn't one of `localhost`, `127.0.0.1`, `::1` (and the bracketed form `[::1]`), `db` or `db-test`, and `env.DEMO_SEED_ALLOW_REMOTE !== 'true'`.

Otherwise it returns normally. Wiring it into `main()` before any `PrismaClient` exists is part of `DEMO_SEED_US-2_T-3`.

**Test:** `apps/api/test/demo-seed/guard.e2e-spec.ts` (unit-style, no database; see CONVENTIONS.md → Testing on the `test/` suffix). Table-driven cases:
1. `NODE_ENV=production` with a localhost URL throws.
2. `NODE_ENV=production` with a remote URL and `DEMO_SEED_ALLOW_REMOTE=true` throws.
3. A remote host (`postgresql://u:p@prod.example.com:5432/x`) without the override throws.
4. The same URL with `DEMO_SEED_ALLOW_REMOTE=true` passes.
5. `localhost`, `127.0.0.1`, `[::1]`, `db` and `db-test` all pass.
6. `DATABASE_URL` unset throws.
7. `DATABASE_URL='not a url'` throws.

For each throwing case, assert that the message mentions the specific rule: `production`, `DEMO_SEED_ALLOW_REMOTE` or `DATABASE_URL`.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
