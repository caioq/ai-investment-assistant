# US-1: Upload a research house's model portfolio

**Status:** Ready
**Traces to:** spec Goal "Ingest one CSV per wallet type: `ticker,targetWeightPct,limitPrice`." / Goal "Keep a full version history — every upload creates a new snapshot rather than overwriting the previous one, so past AI analyses stay reproducible against the exact wallet version they used." / AC "Uploading a CSV for `DIVIDENDS` twice (different `effectiveDate`) results in 2 `RecommendedPortfolio` rows…" / AC "A CSV row with a ticker not previously seen creates the `Asset` and links it correctly in `RecommendedHolding`." / AC "`targetWeightPct` values in a single wallet upload are validated to be reasonable (0–100 per row); rows outside that range are rejected with a clear error, not silently stored." (in `../spec.md`)

As someone following a research house, I want to upload their model portfolio for a wallet type, so the AI Advisor can compare what I actually hold against what's actually recommended.

## Tasks

- [ ] [T-1: extract findOrCreateAsset to MarketDataService](../tasks/RECOMMENDED_PORTFOLIOS_US-1_T-1-find-or-create-asset.md)
- [ ] [T-2: CSV parsing and whole-file validation](../tasks/RECOMMENDED_PORTFOLIOS_US-1_T-2-csv-parse-validate.md)
- [ ] [T-3: POST /advisor/recommended-portfolios/upload](../tasks/RECOMMENDED_PORTFOLIOS_US-1_T-3-upload-endpoint.md)
- [ ] [T-4: every upload is additive](../tasks/RECOMMENDED_PORTFOLIOS_US-1_T-4-additive-history.md)

## Notes

**This story's CSV rules are deliberately not `portfolio`'s.** A holdings CSV accepts partial success — 3 valid rows and 1 malformed row create 3 holdings and report 1 error, because positions are independent. A model portfolio is a *set of weights that only means something whole*: storing 8 of 10 rows produces a snapshot that misrepresents what the research house published, and [advisor](../../advisor/spec.md) then reasons over it as complete with nothing signalling the gap. T-2 rejects the whole file. See `README.md` → "Decisions this pass had to make"; this is the one place a reviewer is most likely to think the two modules should match.

**T-4 protects a guarantee that's invisible until it's already broken.** "Every upload creates a new snapshot" is a one-line Goal, but the natural implementation — upsert on `(userId, walletType)`, or on `(walletType, effectiveDate)` — looks correct, passes an upload test, and silently destroys the property the whole module exists for: an `AdvisorAnalysis` from three months ago must still resolve to the exact wallet version it reasoned over. Once a prior row has been overwritten it is not recoverable, so this is asserted directly rather than inferred from `GET .../latest` returning the right thing.

**T-1 is a refactor of code that already exists elsewhere**, not new logic. Spec AC-3 needs find-or-create-`Asset`, which `PortfolioService` already does — including a P2002 race recovery added after concurrent requests for the same new ticker were found to 500. Reimplementing that here would reintroduce a bug that took a flaky test to find. `Asset` belongs to [market-data](../../market-data/spec.md), so the shared version lands there.
