# US-2: Keep every version of every wallet

**Status:** Ready
**Traces to:** spec Goal "Keep a full version history — every upload creates a new snapshot rather than overwriting the previous one, so past AI analyses stay reproducible against the exact wallet version they used." / AC "Uploading for `DIVIDENDS` twice (different `effectiveDate`) results in 2 `RecommendedPortfolio` rows, the first one unmodified…" / AC "Two uploads for the same wallet with the **same** `effectiveDate` both persist…" (in `../spec.md`)

As the AI Advisor, I want every wallet upload preserved rather than overwritten, so an analysis I produced three months ago can still be traced to the exact recommendations it reasoned over.

## Tasks

- [ ] [T-1: every upload is additive](../tasks/RECOMMENDED_PORTFOLIOS_US-2_T-1-additive-history.md)

## Notes

One task, because this is a single guarantee about one code path — but it gets its own story rather than being folded into US-1 because it is the only reason the module stores versions at all, and because its failure mode is both invisible and unrecoverable.

The natural implementation — upsert on `(userId, walletType)`, or on `(walletType, effectiveDate)` — looks correct, passes every upload test in US-1, and silently destroys the property this module exists for. Nothing surfaces until someone tries to reproduce an old `AdvisorAnalysis` and finds the wallet it referenced has been overwritten. By then the prior snapshots are gone.

`RECOMMENDED_PORTFOLIOS_SHARED_T-1` deliberately leaves `(walletType, effectiveDate)` non-unique for this reason, per the spec's Behavior Notes — two uploads the same day are two legitimate snapshots, not a conflict to resolve. That absence is what T-1 pins, and it's why T-1's test covers the same-date case explicitly: a unique constraint added later "for data hygiene" would break the guarantee while looking like a tidy-up.
