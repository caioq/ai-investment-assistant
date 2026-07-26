# US-6: CI pipeline

**Status:** Ready
**Traces to:** spec Goal "Basic CI (GitHub Actions): install, lint, typecheck, build on every push/PR" / AC "A pushed branch triggers the GitHub Actions workflow, and it passes (lint, typecheck, build) on this skeleton with no feature code yet" (in `../spec.md`)

As a `developer`, I want a GitHub Actions workflow that runs install, lint, typecheck, and build on every push/PR, so that regressions are caught automatically before merge, starting from this skeleton.

## Tasks

- [ ] [T-1: GitHub Actions CI workflow](../tasks/T-1_US-6-ci-workflow.md)

## Notes

Depends on [US-1](./US-1-monorepo-workspace-scaffold.md) through [US-5](./US-5-shared-package-integration.md) — there's nothing meaningful to lint/typecheck/build until those exist. Per `CLAUDE.md`/`WORKFLOW.md`, `spec-implementer` never pushes a branch, so this task's `Done when` is scoped to what's verifiable locally (workflow file present and correct, and the same commands it runs succeeding locally) — actually observing a green run on GitHub happens once the user pushes and reviews the PR, same as every other task.
