# US-2: Read the current recommendation per wallet

**Status:** Ready
**Traces to:** spec Goal "Expose the latest snapshot per wallet type for the Advisor to consume." / AC "Uploading a CSV for `DIVIDENDS` twice (different `effectiveDate`) results in 2 `RecommendedPortfolio` rows, and `GET .../latest` returns only the newer one for that wallet." / AC "`GET .../latest` returns at most one entry per `walletType`, even after multiple uploads across all three types." (in `../spec.md`)

As the AI Advisor, I want the current model portfolio for each wallet type in one call, so I can compare the user's allocation against today's recommendation without knowing anything about how versions are stored.

## Tasks

- [ ] [T-1: GET /advisor/recommended-portfolios/latest](../tasks/RECOMMENDED_PORTFOLIOS_US-2_T-1-latest-endpoint.md)

## Notes

One task: this is a single read whose entire difficulty is the *selection*, and splitting the query from the endpoint would produce a service-layer unit test that asserts the shape of a Prisma call rather than the behaviour anyone cares about. The task's test seeds several versions across all three wallet types and asserts what comes back.

**The selection is the whole story, and it has a case the spec doesn't cover.** "Most recent `effectiveDate`" is unambiguous until two uploads share one — which the spec makes easy, since `effectiveDate` defaults to today and history is deliberately additive with no unique constraint on `(walletType, effectiveDate)`. With a tie, "latest" becomes whichever row Postgres happens to return first, which can differ between two identical requests. T-1 breaks ties on `uploadedAt` descending: re-uploading a corrected file the same day wins, the only reading consistent with the spec's "a correction means uploading a new CSV".

**"At most one per `walletType`" is a real constraint, not a restatement.** The obvious implementation — order everything by `effectiveDate` and take the first N — returns three rows of the *same* wallet when that wallet has three versions and the others have none. The response is per-wallet, capped at three entries total, and a wallet never uploaded simply isn't present.
