# PORTFOLIO_US-1_T-4: DELETE /portfolio/holdings/:id

**Story:** [../stories/US-1-manage-holdings.md](../stories/US-1-manage-holdings.md)
**Status:** Done
**GitHub Issue:** #102 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_US-1_T-1

Add `DELETE /portfolio/holdings/:id` returning `204` with no body, per the spec's API Contract. Scope the delete on `(id, userId)` together and return `404` when nothing matches — same reasoning as `PORTFOLIO_US-1_T-3`: an id-only delete lets any authenticated user destroy another user's row.

Delete the `Holding` only. **Leave the `Asset` alone** even if this was the last holding referencing it: `Asset` is shared across all users and owned by [market-data](../../market-data/spec.md), it carries `PriceHistory` rows with a foreign key onto it, and market-data's daily cron iterates `Asset` rather than `Holding`. Cascading here would delete another user's price history and break a table this module doesn't own.

**Test:** `apps/api/test/portfolio.e2e-spec.ts` (extends the file from earlier tasks) — with a session cookie and a seeded holding:

1. `DELETE` returns `204` with an empty body, and a subsequent `GET /portfolio/holdings` no longer includes it — spec AC-6's first half.
2. The `Asset` row for that ticker still exists after the delete.
3. `DELETE` against a well-formed but non-existent UUID returns `404`.
4. No auth cookie returns `401`.

AC-6's second half — "and from subsequent allocation/summary calculations" — is covered where those endpoints exist: `PORTFOLIO_US-3_T-2` and `PORTFOLIO_US-4_T-1` derive their numbers from the same `userId`-scoped query as case 1, so a deleted row cannot appear in one and not the other. Noted here so the AC isn't assumed dropped.

Confirm red first (no route exists, so the request 404s — cases 1 and 2 are what prove the route is genuinely wired, since case 3 also expects `404`).

**Done when:** the test above passes.
