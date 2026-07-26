# US-5: Shared package scaffold and cross-app import

**Status:** Ready
**Traces to:** spec Goal "pnpm workspace monorepo: ... `packages/shared`" / AC "`packages/shared` is importable from both `apps/web` and `apps/api` (a trivial exported constant resolves correctly from each)" (in `../spec.md`)

As a `developer`, I want `packages/shared` scaffolded as a real workspace package and proven importable from both `apps/api` and `apps/web`, so that the `portfolio` module (the first to add real shared logic, per `CONVENTIONS.md`) can rely on the wiring already working.

## Tasks

- [ ] [T-1: Scaffold packages/shared](../tasks/US-5_T-1-scaffold-shared-package.md)
- [ ] [T-2: Import from apps/api](../tasks/US-5_T-2-import-from-api.md)
- [ ] [T-3: Import from apps/web](../tasks/US-5_T-3-import-from-web.md)

## Notes

Depends on [US-1](./US-1-monorepo-workspace-scaffold.md) (workspace linking), [US-2](./US-2-backend-health-check-skeleton.md), and [US-3](./US-3-frontend-placeholder-skeleton.md) (both apps must exist to import into). T-2 and T-3 are independent of each other once T-1 is done and can be implemented in parallel.
