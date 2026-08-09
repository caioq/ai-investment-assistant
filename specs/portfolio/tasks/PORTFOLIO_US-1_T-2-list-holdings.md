# PORTFOLIO_US-1_T-2: GET /portfolio/holdings

**Story:** [../stories/US-1-manage-holdings.md](../stories/US-1-manage-holdings.md)
**Status:** Not Started
**GitHub Issue:** #100 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_SHARED_T-1, PORTFOLIO_SHARED_T-2

Add `GET /portfolio/holdings` returning that user's `Holding[]` **joined with `Asset`** (Prisma `include: { asset: true }`), filtered on `userId: req.user.id`. Per the spec's API Contract the join is part of the contract, not an optimisation: the consumer needs `ticker`, `name`, `sector`, `currentPrice`, `investmentStyle`, and `riskRating` — all of which live on `Asset`, not `Holding` — and without the join the dashboard would issue one follow-up request per row.

Return an empty array (not `404`) for a user with no holdings; an empty portfolio is a normal state for a new account, and a `404` would make the dashboard render an error on first login.

**Test:** `apps/api/test/portfolio.e2e-spec.ts` (extends the file from `PORTFOLIO_US-1_T-1`) — with a session cookie:

1. After creating two holdings, `GET /portfolio/holdings` returns `200` with both, each carrying a nested `asset` object containing at least `ticker` and `name` — so a regression that drops the `include` fails here rather than in a UI ticket.
2. A freshly-registered user with no holdings gets `200` and `[]`.
3. No auth cookie returns `401`.

Confirm red first (no route exists, so the request 404s), then green.

**Done when:** the test above passes.
