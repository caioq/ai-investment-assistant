# T-1 (US-6): GitHub Actions CI workflow

**Story:** [../stories/US-6-ci-pipeline.md](../stories/US-6-ci-pipeline.md)
**Status:** Not Started
**GitHub Issue:** #13 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)

Add `.github/workflows/ci.yml` triggered on push and pull_request, running in order: `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter api build`, `pnpm --filter web build` — matching the root scripts from [T-1_US-1](./T-1_US-1-init-pnpm-workspace.md) and mirroring the spec's Behavior Notes exactly (no test step yet, per spec).

**Test:** No test framework applies to a workflow YAML file directly. Verify two things locally, since `spec-implementer` doesn't push branches (per `CLAUDE.md`/`WORKFLOW.md`): (1) the composite command `pnpm install && pnpm lint && pnpm typecheck && pnpm --filter api build && pnpm --filter web build` exits `0` from a clean clone; (2) `.github/workflows/ci.yml` exists, triggers on `push`/`pull_request`, and its steps match that same command list in that order. Confirm red first (no workflow file exists), then green after adding it. Actually observing a green run on GitHub happens once the user pushes and reviews the resulting PR — outside this task's scope.

**Done when:** the composite local command exits `0`, and `.github/workflows/ci.yml` is present with the steps and triggers described above.
