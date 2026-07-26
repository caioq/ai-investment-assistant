# T-1 (US-5): Scaffold packages/shared

**Story:** [../stories/US-5-shared-package-integration.md](../stories/US-5-shared-package-integration.md)
**Status:** Not Started
**GitHub Issue:** #10 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)

Scaffold `packages/shared` as a real workspace package: `package.json` (name `@ai-investment-assistant/shared`), `tsconfig.json` extending the shared root `tsconfig.base.json` from [T-2_US-1](./T-2_US-1-shared-lint-config.md), and `src/index.ts` exporting one trivial constant, e.g. `export const SHARED_PACKAGE_NAME = "shared";`.

**Test:** `pnpm --filter @ai-investment-assistant/shared typecheck` (or `build`, if the package builds to `dist`) exits `0`. Confirm red first (package doesn't exist yet), then green after scaffolding.

**Done when:** the package typechecks/builds cleanly and is resolvable via the workspace protocol (`workspace:*`) once declared as a dependency elsewhere.
