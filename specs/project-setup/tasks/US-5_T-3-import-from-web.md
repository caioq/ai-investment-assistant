# T-3 (US-5): Import from apps/web

**Story:** [../stories/US-5-shared-package-integration.md](../stories/US-5-shared-package-integration.md)
**Status:** Not Started
**GitHub Issue:** #12 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)

Add `@ai-investment-assistant/shared` (`workspace:*`) as a dependency of `apps/web`, and consume `SHARED_PACKAGE_NAME` from [T-1_US-5](./T-1_US-5-scaffold-shared-package.md) in the placeholder page from [T-2_US-3](./T-2_US-3-placeholder-page.md) (e.g. rendered in a data attribute or a small visible note), so the import is actually exercised, not just declared.

**Test:** Extend `apps/web/app/page.test.tsx` from T-2_US-3 asserting the rendered output reflects the value imported from `@ai-investment-assistant/shared`, proving the import resolves at both type-check and runtime inside `apps/web`.

**Done when:** that test passes red-green.
