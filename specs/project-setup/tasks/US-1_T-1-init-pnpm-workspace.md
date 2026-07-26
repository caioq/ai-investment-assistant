# T-1 (US-1): Initialize pnpm workspace and root scripts

**Story:** [../stories/US-1-monorepo-workspace-scaffold.md](../stories/US-1-monorepo-workspace-scaffold.md)
**Status:** Not Started
**GitHub Issue:** #1 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)

Create `pnpm-workspace.yaml` at repo root declaring `apps/*` and `packages/*` as workspace packages, and a root `package.json` with `dev`, `build`, `lint`, `typecheck`, and `db:migrate` scripts that proxy to the relevant workspace package(s) via `pnpm --filter` (e.g. `db:migrate` targets `--filter api`, `dev`/`build`/`lint`/`typecheck` fan out across all workspace packages via `-r`).

**Test:** No automated test framework applies to root tooling config — verify with the same command the spec's own Acceptance Criterion names: from a fresh clone, `pnpm install` exits `0`. Confirm red first (before this task, there is no `pnpm-workspace.yaml`/root `package.json`, so `pnpm install` fails with "no package.json found" or equivalent), then green after creating both files.

**Done when:** `pnpm install` exits `0` from a clean clone, `pnpm-workspace.yaml` lists `apps/*` and `packages/*`, and the root `package.json` defines `dev`, `build`, `lint`, `typecheck`, `db:migrate` scripts.
