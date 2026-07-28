# US-2_T-1: Scaffold NestJS app at apps/api

**Story:** [../stories/US-2-backend-health-check-skeleton.md](../stories/US-2-backend-health-check-skeleton.md)
**Status:** Done
**GitHub Issue:** #4 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** US-1_T-1

Scaffold a NestJS app at `apps/api` (standard Nest CLI layout: `src/main.ts`, `src/app.module.ts`), with its own `apps/api/package.json` (name, `start:dev`/`build` scripts) wired into the pnpm workspace from [US-1_T-1](./US-1_T-1-init-pnpm-workspace.md).

**Test:** `pnpm --filter api build` exits `0` and produces `apps/api/dist/main.js`. Confirm red first (no `apps/api` package exists, so the `--filter api` target doesn't resolve), then green after scaffolding.

**Done when:** `pnpm --filter api build` succeeds and produces the compiled entrypoint at `apps/api/dist/main.js`.
