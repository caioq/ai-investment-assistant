# US-6_T-1: GitHub Actions CI workflow

**Story:** [../stories/US-6-ci-pipeline.md](../stories/US-6-ci-pipeline.md)
**Status:** Done
**GitHub Issue:** #13 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** US-1_T-2, US-1_T-3, US-2_T-1, US-2_T-2, US-3_T-1, US-3_T-2, US-4_T-1, US-4_T-2, US-5_T-1, US-5_T-2, US-5_T-3 (needs a full, real workspace to install/lint/typecheck/build)

Add `.github/workflows/ci.yml` triggered on push and pull_request, running in order: `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter api build`, `pnpm --filter web build` — matching the root scripts from [US-1_T-1](./US-1_T-1-init-pnpm-workspace.md) and mirroring the spec's Behavior Notes exactly (no test step yet, per spec).

**Test:** No test framework applies to a workflow YAML file directly. Verify two things locally before pushing: (1) the composite command `pnpm install && pnpm lint && pnpm typecheck && pnpm --filter api build && pnpm --filter web build` exits `0` from a clean clone; (2) `.github/workflows/ci.yml` exists, triggers on `push`/`pull_request`, and its steps match that same command list in that order. Confirm red first (no workflow file exists), then green after adding it. Since `spec-implementer` pushes its own branch and opens its own PR once this task is green (per `CONVENTIONS.md` → "Branching, pushing, and PRs per task"), also confirm the resulting GitHub Actions run on that PR is actually green — that's the real proof, not just the local command.

**Done when:** the composite local command exits `0`, `.github/workflows/ci.yml` is present with the steps and triggers described above, and the GitHub Actions run on this task's own pushed branch is green.
