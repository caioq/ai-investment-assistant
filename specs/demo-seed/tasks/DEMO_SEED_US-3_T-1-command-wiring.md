# DEMO_SEED_US-3_T-1: `db:seed` / `bootstrap:demo` command wiring

**Story:** [../stories/US-3-one-command-setup.md](../stories/US-3-one-command-setup.md)
**Status:** Not Started
**GitHub Issue:** #365 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DEMO_SEED_US-2_T-3

Wire up the commands from the spec's API Contract:
- add `tsx` to `apps/api` devDependencies
- `apps/api/prisma.config.ts`: `migrations.seed: 'tsx prisma/seed/index.ts'`
- `apps/api/package.json`: `"db:seed": "prisma db seed"`
- root `package.json`: `"db:seed": "pnpm --filter api run db:seed"` and `"bootstrap:demo": "bash scripts/bootstrap.sh --seed"`
- `scripts/bootstrap.sh`: parse `--seed`. After migrations and the `packages/shared` build, if `--seed` was passed, run `pnpm db:seed` and print the demo credentials. Without it, never seed.

**Test:** `apps/api/test/demo-seed/command.e2e-spec.ts`, which spawns the real CLI with `child_process.spawnSync('pnpm', ['--filter', 'api', 'run', 'db:seed'], { env })` from the repo root:
1. With `NODE_ENV=production` and the test `DATABASE_URL`: exit code ≠ 0, stderr/stdout contains the guard's `production` message, and **no** user with the demo email exists afterwards (the guard ran before any write).
2. With `DATABASE_URL=postgresql://u:p@prod.example.com:5432/x` and no override: exit ≠ 0 with the `DEMO_SEED_ALLOW_REMOTE` message, and the process exits quickly without trying to connect (assert < 10s).

Also confirm manually, and note it in the PR: on a fresh local database, `pnpm bootstrap` leaves `users` empty, and `pnpm bootstrap:demo` ends by printing `demo@example.com / Demo1234!`. The successful path (exit 0 against a local database) isn't spawned in this suite, because it would write the real, non-namespaced fixtures into the shared test database.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
