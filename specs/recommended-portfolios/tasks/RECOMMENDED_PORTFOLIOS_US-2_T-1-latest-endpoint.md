# RECOMMENDED_PORTFOLIOS_US-2_T-1: GET /advisor/recommended-portfolios/latest

**Story:** [../stories/US-2-latest-per-wallet.md](../stories/US-2-latest-per-wallet.md)
**Status:** Not Started
**GitHub Issue:** #137 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** RECOMMENDED_PORTFOLIOS_SHARED_T-1, RECOMMENDED_PORTFOLIOS_SHARED_T-2

Add `GET /advisor/recommended-portfolios/latest` returning, per `walletType`, the caller's most recent `RecommendedPortfolio` with its `RecommendedHolding[]` included — **at most one entry per wallet type, so at most 3** (spec API Contract and AC-2). Scope on `userId: req.user.id`.

**Selection rules**, in order:

1. Most recent `effectiveDate` for that `walletType`.
2. **Tie-break on `uploadedAt` descending.** The spec says only "most recent `effectiveDate`", but `effectiveDate` defaults to today and nothing prevents two uploads the same day — `RECOMMENDED_PORTFOLIOS_SHARED_T-1` deliberately leaves `(walletType, effectiveDate)` non-unique because history is additive. Without a tie-break, "latest" is whichever row Postgres returns first, which can differ between two identical requests. Newest upload wins, the only reading consistent with the spec's "a correction means uploading a new CSV".

Include the holdings — the advisor's whole use for this endpoint is comparing target weights and limit prices against the user's actual positions, so returning bare portfolio rows would force a follow-up query per wallet.

A wallet type never uploaded is simply **absent** from the response; return `[]` (not `404`) when the user has uploaded nothing at all — an empty set is a normal state, and a `404` would make the advisor treat "no recommendations yet" as an error.

The naive implementation — order everything by `effectiveDate` and take the first 3 — returns three versions of the *same* wallet when only that wallet has history. Select per `walletType`, don't slice a global ordering.

**Test:** `apps/api/test/recommended-portfolios.e2e-spec.ts` (extends the file from `RECOMMENDED_PORTFOLIOS_US-1_T-3`) — with a session cookie, seeding `RecommendedPortfolio` rows directly via Prisma (this endpoint reads snapshots and must not depend on the upload path):

1. **Spec AC-1's second half** — two `DIVIDENDS` snapshots with different `effectiveDate`s: the response contains exactly one `DIVIDENDS` entry, and it's the newer one, with its holdings.
2. **Spec AC-2** — with 3, 2 and 1 versions seeded across the three wallet types respectively, the response has exactly **3** entries, one per type. This is the case a "take the first 3 by `effectiveDate`" implementation fails, since it would return three `DIVIDENDS` rows.
3. **The tie-break** — two `DIVIDENDS` snapshots sharing one `effectiveDate` but differing in `uploadedAt`: the later-uploaded one is returned. Assert it, don't rely on insertion order.
4. A wallet type with no uploads is absent from the response rather than present-and-null.
5. A user with no snapshots gets `200` and `[]`.
6. Snapshots belonging to **another user** never appear — seed one for user B and assert user A's response is unaffected.
7. No auth cookie returns `401`.

Confirm red first (no route exists, so the request 404s), then green.

**Done when:** the tests above pass — cases 2 and 3 especially: the first is the difference between "the latest per wallet" and "the three latest overall", and the second is the case the spec never specified and that fails non-deterministically once it does occur.
