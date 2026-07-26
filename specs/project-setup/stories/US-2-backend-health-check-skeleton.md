# US-2: Backend health-check skeleton

**Status:** Ready
**Traces to:** spec Goal "NestJS skeleton with a health-check endpoint" / AC "`pnpm --filter api start:dev` serves `GET /health` returning `200 { status: "ok" }`" (in `../spec.md`)

As a `developer`, I want a NestJS app skeleton at `apps/api` with a working `GET /health` endpoint, so that later modules have a running backend to add real endpoints to, and CI/local tooling has something concrete to build against.

## Tasks

- [ ] [T-1: Scaffold NestJS app at apps/api](../tasks/T-1_US-2-scaffold-nest-api.md)
- [ ] [T-2: GET /health endpoint](../tasks/T-2_US-2-health-endpoint.md)

## Notes

No auth, no DB access from this endpoint — per spec Non-Goals, the health-check is unauthenticated and has nothing to do with Prisma/Postgres (that's US-4). Keep `HealthController` trivial.
