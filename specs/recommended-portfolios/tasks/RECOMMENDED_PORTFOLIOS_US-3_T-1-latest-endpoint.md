# RECOMMENDED_PORTFOLIOS_US-3_T-1: GET /advisor/recommended-portfolios/latest

**Story:** [../stories/US-3-latest-per-wallet.md](../stories/US-3-latest-per-wallet.md)
**Status:** Not Started
**GitHub Issue:** #150 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** RECOMMENDED_PORTFOLIOS_SHARED_T-1, RECOMMENDED_PORTFOLIOS_SHARED_T-2

Add `GET /advisor/recommended-portfolios/latest` returning, per `walletType`, the caller's most recent `RecommendedPortfolio` with its `RecommendedHolding[]` included — **at most one entry per type, so at most 3** (spec API Contract and AC-12). Scope on `userId: req.user.id`.

Selection, per the spec's Behavior Notes:

1. Most recent `effectiveDate` for that `walletType`.
2. **Tie-break on `uploadedAt` descending.** `effectiveDate` defaults to today and history is deliberately additive with no unique constraint, so two same-day uploads are easy to produce — and without a tie-break "latest" is whichever row Postgres returns first, which can differ between two identical requests. Newest upload wins, the only reading consistent with "a correction means uploading a new CSV".

Include the holdings: the Advisor's whole use for this endpoint is comparing target weights and ceiling prices against the user's actual positions, so returning bare portfolio rows would force a follow-up query per wallet.

A wallet type never uploaded is **absent** from the response; a user with nothing uploaded gets `200` and `[]`, not `404` — "no recommendations yet" is a normal state for a new account, and a `404` would make the Advisor treat it as an error.

The naive implementation — order everything by `effectiveDate` and take the first 3 — returns three versions of the *same* wallet when only that wallet has history. Select per `walletType`; don't slice a global ordering.

**Test:** `apps/api/test/recommended-portfolios.e2e-spec.ts` (extends the file from `RECOMMENDED_PORTFOLIOS_US-1_T-6`) — with a session cookie, seeding `RecommendedPortfolio` rows **directly via Prisma** (this endpoint reads snapshots and must not depend on the upload path working):

1. **Spec AC-10, second half** — two `DIVIDENDS` snapshots with different `effectiveDate`s: exactly one `DIVIDENDS` entry comes back, the newer one, with its holdings.
2. **Spec AC-12** — with 3, 2 and 1 versions seeded across the three wallet types, the response has exactly **3** entries, one per type. This is the case a "take the first 3 by `effectiveDate`" implementation fails, returning three `DIVIDENDS` rows.
3. **Spec AC-11, second half** — two `DIVIDENDS` snapshots sharing one `effectiveDate` but differing in `uploadedAt`: the later-uploaded one is returned. Assert it explicitly rather than relying on insertion order.
4. A wallet type with no uploads is absent from the response, rather than present with a null payload.
5. A user with no snapshots gets `200` and `[]`.
6. Snapshots belonging to **another user** never appear — seed one for user B and assert user A's response is unaffected.
7. No auth cookie returns `401`.

Confirm red first (no route exists, so the request 404s), then green.

**Done when:** the tests above pass — cases 2 and 3 especially: the first is the difference between "the latest per wallet" and "the three latest overall", and the second is the case that fails non-deterministically once it occurs, which makes it nearly impossible to diagnose from a bug report.
