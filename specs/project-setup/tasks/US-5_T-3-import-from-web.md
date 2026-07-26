# US-5_T-3: Import from apps/web

**Story:** [../stories/US-5-shared-package-integration.md](../stories/US-5-shared-package-integration.md)
**Status:** Not Started
**GitHub Issue:** #12 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** US-5_T-1, US-3_T-2

Add `@ai-investment-assistant/shared` (`workspace:*`) as a dependency of `apps/web`, and consume `SHARED_PACKAGE_NAME` from [US-5_T-1](./US-5_T-1-scaffold-shared-package.md) in the placeholder page from [US-3_T-2](./US-3_T-2-placeholder-page.md) (e.g. rendered in a data attribute or a small visible note), so the import is actually exercised, not just declared.

**Test:** Extend `apps/web/app/page.test.tsx` from US-3_T-2 asserting the rendered output reflects the value imported from `@ai-investment-assistant/shared`, proving the import resolves at both type-check and runtime inside `apps/web`.

**Done when:** that test passes red-green.
