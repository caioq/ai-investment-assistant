# AUTH_US-1_T-1: User Prisma model + migration

**Story:** [../stories/US-1-registration.md](../stories/US-1-registration.md)
**Status:** Done
**GitHub Issue:** #36 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add the `User` model to `apps/api/prisma/schema.prisma` exactly as specified in the spec's Data Model section (`id` UUIDv7 stored as native `uuid`, `email` unique, `passwordHash`/`createdAt` mapped to `snake_case` columns via `@map`), and generate the migration.

**Test:** No unit test applies to a schema-only migration — verify with the same pattern as `project-setup`'s `US-4_T-2`: with the `db` container up, `pnpm db:migrate` exits `0` and creates a `users` table with the spec's columns (check via `psql -h localhost -p 5432 -U postgres -d investment_assistant -c '\d users'` or `prisma migrate status`). Confirm red first (no `User` model, so `\d users` reports "does not exist"), then green after adding the model and migrating.

**Done when:** `pnpm db:migrate` completes without error against a running `db` container, and the `users` table matches the spec's `User` model.
