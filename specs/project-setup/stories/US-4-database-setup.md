# US-4: Database setup (docker-compose + Prisma init)

**Status:** Ready
**Traces to:** spec Goal "Prisma initialized against Postgres, with separate dev and test databases via `docker-compose`" / AC "`docker compose up -d db db-test` brings up both Postgres instances, reachable on their configured ports" / AC "`pnpm db:migrate` runs against `db` with no models yet and completes without error" (in `../spec.md`)

As a `developer`, I want two Postgres instances (`db`, `db-test`) run via `docker-compose` and Prisma initialized against them with no models yet, so that every later module can add schema and migrations, and integration tests never touch dev data.

## Tasks

- [x] [T-1: docker-compose Postgres services](../tasks/US-4_T-1-docker-compose-postgres.md)
- [ ] [T-2: Prisma init and db:migrate wiring](../tasks/US-4_T-2-prisma-init.md)

## Notes

Depends on [US-2](./US-2-backend-health-check-skeleton.md) — `apps/api/prisma/schema.prisma` lives inside the NestJS app scaffolded there, so T-1 in this story can run independently (it only touches root `docker-compose.yml`), but T-2 needs `apps/api` to already exist.
