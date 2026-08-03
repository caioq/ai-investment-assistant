# Project Setup

**Status:** Approved
**Depends on:** none

## Problem

No application code exists yet — every other module's spec assumes a working monorepo, a reachable Postgres database, and running app skeletons already exist. This module is the foundation all of them build on.

## Goals

- pnpm workspace monorepo: `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared`.
- NestJS skeleton with a health-check endpoint.
- Next.js skeleton with a placeholder home page.
- Prisma initialized against Postgres, with separate dev and test databases via `docker-compose`.
- Shared TypeScript/ESLint/Prettier config used consistently by both apps and `packages/shared`.
- Basic CI (GitHub Actions): install, lint, typecheck, build on every push/PR.
- One-command local bootstrap (`pnpm bootstrap`): install deps, start Postgres, create `apps/api/.env` if missing, migrate, build `packages/shared` — so a fresh clone needs exactly two commands (`pnpm bootstrap && pnpm dev`) to get running.
- `.env.example` documenting every environment variable later specs will need (`DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `FRONTEND_URL`), even before they're consumed. (`market-data`'s provider needs no token — see its own spec.)

## Non-Goals

- Any business logic or feature module — those are separate specs (`auth`, `portfolio`, etc.).
- Production deployment (Vercel/Railway) and its CI/CD pipeline — deferred to a later pass once there's something worth deploying.
- Authentication — the health-check endpoint and placeholder page are unauthenticated; `auth` is a separate spec.

## Data Model

No domain models yet. `apps/api/prisma/schema.prisma` contains only the `datasource`/`generator` blocks — every other spec adds its own models on top of this file.

## API Contract

| Method | Path | Response |
|---|---|---|
| GET | `/health` | `{ status: "ok" }` — smoke-check endpoint, no auth |

Next.js: a single placeholder page at `/` (e.g. "AI Investment Assistant — under construction"), no other routes yet.

## Behavior Notes

Monorepo layout:

```
/
├── apps/
│   ├── web/                 # Next.js (App Router), TS, Tailwind
│   └── api/                 # NestJS, TS
├── packages/
│   └── shared/               # empty scaffold for now — first real export lands with the portfolio module
├── docker-compose.yml         # Postgres: `db` (dev) + `db-test` (test)
├── .github/workflows/ci.yml
├── pnpm-workspace.yaml
└── package.json                # root scripts: dev, build, lint, typecheck, db:migrate
```

- `docker-compose.yml` runs two Postgres services (`db` for dev, `db-test` on a separate port) so integration tests never touch dev data — this is what `CONVENTIONS.md`'s testing sections assume exists.
- CI workflow: on push/PR — `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter api build`, `pnpm --filter web build`. No test step yet — nothing to test until the first feature module lands; added then, as part of that module's own tasks.
- Root `package.json` scripts (`dev`, `build`, `lint`, `typecheck`, `db:migrate`) proxy to the workspace filters so one command runs both apps — referenced throughout `WORKFLOW.md` and every module spec.
- `.env.example` lists every variable later specs need, even though most aren't consumed yet — so `auth` and `advisor` don't each have to reintroduce env-var setup from scratch.
- `scripts/bootstrap.sh` (root `pnpm bootstrap`) chains the manual setup steps into one idempotent command — re-running it is always safe: it skips creating `apps/api/.env` if one already exists (never overwrites local edits), and `docker compose up -d db --wait`/`prisma migrate dev`/the `packages/shared` build are all no-ops when already up to date. Named `bootstrap`, not `setup` — `pnpm setup` is a reserved pnpm CLI command (bootstraps pnpm itself) and silently shadows a same-named package.json script when invoked without `run`, so that name was avoided entirely rather than relying on everyone remembering to type `pnpm run setup`.

## Acceptance Criteria

- [ ] `pnpm install` completes cleanly from a fresh clone.
- [ ] `docker compose up -d db db-test` brings up both Postgres instances, reachable on their configured ports.
- [ ] `pnpm db:migrate` runs against `db` with no models yet and completes without error.
- [ ] `pnpm --filter api start:dev` serves `GET /health` returning `200 { status: "ok" }`.
- [ ] `pnpm --filter web dev` serves the placeholder page at `http://localhost:3000`.
- [ ] A pushed branch triggers the GitHub Actions workflow, and it passes (lint, typecheck, build) on this skeleton with no feature code yet.
- [ ] `packages/shared` is importable from both `apps/web` and `apps/api` (a trivial exported constant resolves correctly from each).
