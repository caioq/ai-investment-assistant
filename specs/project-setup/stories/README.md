# Project Setup — Stories Index

**Spec:** [../spec.md](../spec.md)

One row per story. Keep this file in sync whenever a story is added or its status changes — it's the only place to see the module's story-level picture without opening every file.

| Story | Title | Status | Tasks |
|---|---|---|---|
| [US-1](./US-1-monorepo-workspace-scaffold.md) | Monorepo workspace scaffold | Done | T-1..T-3 in `../tasks/` |
| [US-2](./US-2-backend-health-check-skeleton.md) | Backend health-check skeleton | Done | T-1..T-2 in `../tasks/` |
| [US-3](./US-3-frontend-placeholder-skeleton.md) | Frontend placeholder skeleton | Done | T-1..T-2 in `../tasks/` |
| [US-4](./US-4-database-setup.md) | Database setup (docker-compose + Prisma init) | Ready | T-1..T-2 in `../tasks/` |
| [US-5](./US-5-shared-package-integration.md) | Shared package scaffold and cross-app import | Ready | T-1..T-3 in `../tasks/` |
| [US-6](./US-6-ci-pipeline.md) | CI pipeline | Ready | T-1 in `../tasks/` |

<!-- One row per story, in implementation order where an order is implied by the spec's dependencies. -->

## Cross-cutting tasks

None yet — every task in this pass belongs to exactly one story. `packages/shared`'s cross-app import work is split per-app under US-5 rather than filed as `SHARED` because each half (`apps/api` consuming it, `apps/web` consuming it) is independently small and independently testable.

## Out of scope for this pass

- Production deployment (Vercel/Railway) and its CI/CD pipeline — explicitly a spec Non-Goal, deferred to a later pass.
- Authentication — explicitly a spec Non-Goal; `auth` is a separate module spec.
