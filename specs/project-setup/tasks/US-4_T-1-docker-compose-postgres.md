# US-4_T-1: docker-compose Postgres services

**Story:** [../stories/US-4-database-setup.md](../stories/US-4-database-setup.md)
**Status:** Not Started
**GitHub Issue:** #8 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add root `docker-compose.yml` with two Postgres services: `db` (dev, matching `DATABASE_URL` from [US-1_T-3](./US-1_T-3-env-example.md)'s `.env.example`) and `db-test` (test, on a separate host port so it never collides with `db`), per spec Behavior Notes.

**Test:** No unit test applies to a Compose file — verify with the spec's own Acceptance Criterion command: `docker compose up -d db db-test` exits `0`, and both services report as running/healthy via `docker compose ps`. Confirm red first (no `docker-compose.yml` exists, so the command errors "no configuration file provided"), then green after adding the file.

**Done when:** `docker compose up -d db db-test` brings up both containers, each reachable on its configured port (verified with `pg_isready -h localhost -p <port>` for each).
