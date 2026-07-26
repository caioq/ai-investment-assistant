# T-2 (US-5): Import from apps/api

**Story:** [../stories/US-5-shared-package-integration.md](../stories/US-5-shared-package-integration.md)
**Status:** Not Started
**GitHub Issue:** #11 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)

Add `@ai-investment-assistant/shared` (`workspace:*`) as a dependency of `apps/api`, and consume `SHARED_PACKAGE_NAME` from [T-1_US-5](./T-1_US-5-scaffold-shared-package.md) somewhere it's exercised by a test — extend the `HealthController` response or add a small dedicated service that surfaces the constant.

**Test:** Extend `apps/api/test/health.e2e-spec.ts` from [T-2_US-2](./T-2_US-2-health-endpoint.md) (or add a new spec) asserting the value imported from `@ai-investment-assistant/shared` equals `"shared"`, proving the import resolves at both type-check and runtime inside `apps/api`.

**Done when:** that test passes red-green.
