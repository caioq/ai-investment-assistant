# US-1_T-2: Shared TypeScript/ESLint/Prettier config

**Story:** [../stories/US-1-monorepo-workspace-scaffold.md](../stories/US-1-monorepo-workspace-scaffold.md)
**Status:** Not Started
**GitHub Issue:** #2 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** US-1_T-1

Add a shared `tsconfig.base.json`, root ESLint config, and root Prettier config, extended/referenced by `apps/web`, `apps/api`, and `packages/shared` rather than each package declaring its own independent rules.

**Test:** No unit test applies to lint/format config directly — verify via the root `lint` and `typecheck` scripts added in T-1. From repo root, `pnpm lint` and `pnpm typecheck` both exit `0` against whatever workspace packages exist at the time this task lands (even if some are still stubs from later tasks). Confirm red first (no config present → `pnpm lint`/`pnpm typecheck` fail or the scripts have nothing to invoke), then green after the shared config is wired into each package.

**Done when:** `pnpm lint` and `pnpm typecheck` both exit `0` from repo root, and `apps/web`, `apps/api`, `packages/shared` each extend the shared root config rather than defining their own from scratch.
