# DEMO_SEED_US-3_T-2: README and CONVENTIONS docs, fresh-clone check

**Story:** [../stories/US-3-one-command-setup.md](../stories/US-3-one-command-setup.md)
**Status:** Done
**GitHub Issue:** #366 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DEMO_SEED_US-3_T-1, DEMO_SEED_US-1_T-2

Documentation and final end-to-end verification:
- **`README.md`:** add a "Demo account" section with `pnpm bootstrap:demo && pnpm dev`, the credentials `demo@example.com` / `Demo1234!`, `pnpm db:seed` for an already bootstrapped database, and what the production guard refuses (with the `DEMO_SEED_ALLOW_REMOTE` override). Also fix the stale "Status" paragraph.
- **`CONVENTIONS.md`:** record the seed pattern:
  - its location outside `src/`
  - `runSeed(prisma, fixtures)` plus a guarded `main()`
  - insert-only writes to global tables
  - namespaced fixtures in `demo-seed.e2e-spec.ts`
- **`.env.example`:** document `DEMO_SEED_ALLOW_REMOTE`.

**Test:** This is a manual acceptance check, since it's a docs task with no code under test. Record the result in the PR description:
1. `git clone` into a temp directory, then run `pnpm bootstrap:demo && pnpm dev`. It completes without manual steps.
2. Log in as `demo@example.com` / `Demo1234!`. The dashboard shows populated allocation charts, a 1Y performance chart with IBOVESPA and CDI overlays, and the advisor card with the seeded analysis. `/holdings` lists the holdings, and `/data-sources` shows import state on every card.
3. `pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm --filter api test:e2e` all pass.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
