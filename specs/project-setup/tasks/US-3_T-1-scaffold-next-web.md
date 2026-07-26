# US-3_T-1: Scaffold Next.js app at apps/web

**Story:** [../stories/US-3-frontend-placeholder-skeleton.md](../stories/US-3-frontend-placeholder-skeleton.md)
**Status:** Not Started
**GitHub Issue:** #6 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** US-1_T-1

Scaffold a Next.js (App Router) + TypeScript + Tailwind app at `apps/web`, with its own `apps/web/package.json` (name, `dev`/`build` scripts) wired into the pnpm workspace from [US-1_T-1](./US-1_T-1-init-pnpm-workspace.md).

**Test:** `pnpm --filter web build` exits `0`. Confirm red first (no `apps/web` package exists, so the `--filter web` target doesn't resolve), then green after scaffolding.

**Done when:** `pnpm --filter web build` succeeds.
