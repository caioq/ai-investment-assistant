# T-2 (US-4): Prisma init and db:migrate wiring

**Story:** [../stories/US-4-database-setup.md](../stories/US-4-database-setup.md)
**Status:** Not Started
**GitHub Issue:** #9 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)

Initialize Prisma at `apps/api/prisma/schema.prisma` with only the `datasource`/`generator` blocks (no models yet, per spec Data Model section), pointed at `DATABASE_URL`. Wire the root `db:migrate` script from [T-1_US-1](./T-1_US-1-init-pnpm-workspace.md) to run `pnpm --filter api exec prisma migrate dev` against the `db` service from [T-1_US-4](./T-1_US-4-docker-compose-postgres.md).

**Test:** With the `db` container from T-1 running, `pnpm db:migrate` exits `0`. Confirm red first (no `schema.prisma`/no `db:migrate` wiring, so the command errors), then green after this task's changes.

**Done when:** `pnpm db:migrate` completes without error against a running `db` container, with zero models defined.
