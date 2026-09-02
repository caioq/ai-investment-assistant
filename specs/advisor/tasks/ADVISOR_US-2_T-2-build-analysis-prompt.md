# ADVISOR_US-2_T-2: build the analysis prompt

**Story:** [../stories/US-2-generate-analysis.md](../stories/US-2-generate-analysis.md)
**Status:** Done
**GitHub Issue:** #188 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** ADVISOR_SHARED_T-2

Build the three-block prompt the spec's Behavior Notes describe, as a function separable from the API call so it can be unit-tested against fixtures.

- **Block 1 — the user's portfolio.** `quantity`/`avgPrice` from `Holding`; `ticker`, current value, and `sector`/`subSector`/`investmentStyle`/`riskRating` from `Asset`. Plus allocation by sector/stock/style/rating and performance metrics. Source these from `PortfolioService.listHoldings`, `getAllocation`, `getSummary` and `getPerformance` — all exported by `PortfolioModule`; never query `holdings`/`assets` directly from this module.
- **Block 2 — the report.** `AdvisorReport.rawText` when `advisorReportId` was passed, truncated to ~15k characters. Truncate on a character budget, not a token guess, and note in the prompt that the text was truncated so the model doesn't treat a mid-sentence cut as the author's full position.
- **Block 3 — the recommended wallets.** `RecommendedPortfoliosService.getLatestPerWallet`, rendered as `{walletType, effectiveDate, holdings: [{ticker, targetWeightPct, limitPrice, sector, subSector, investmentStyle, riskRating}]}`.

**Block 3 requires widening a `Done` module's query.** `getLatestPerWallet` currently returns `include: { holdings: true }` with no `asset` relation, so classification and `currentPrice` are simply absent — which makes two spec ACs (the unheld-recommended-ticker one, and the `currentPrice > limitPrice` flag) impossible to satisfy. Change it to `include: { holdings: { include: { asset: true } } }` and widen `RecommendedPortfolioWithHoldings` accordingly. It is one line plus a type, but it means this task's PR touches `recommended-portfolios/`; that is expected, not scope creep.

**Every classification field is optional and `null` is the normal case.** A portfolio with no assets CSV imported has `null` for all four on every holding. The prompt must render that as genuinely absent — omit the key, or write a real JSON `null` — and must never emit the strings `"undefined"` or `"null"`, which read to the model as data. This has its own spec AC because it's the failure that looks fine in review and quietly poisons the analysis.

Instruct the model in the prompt that `score` is 0–10; JSON Schema structured output supports no `minimum`/`maximum`, so the prompt is the only place the range is stated (`ADVISOR_US-2_T-3` clamps it in code as the backstop).

**Test:** `apps/api/src/advisor/advisor.service.spec.ts` (unit, all three dependency services stubbed): (1) a fully-populated portfolio produces a prompt containing each holding's ticker, its sector and its risk rating; (2) a portfolio whose assets are entirely unclassified produces a prompt with **no** occurrence of `"undefined"` or the literal string `"null"` — a regex assertion over the whole prompt, which is the spec AC; (3) a recommended wallet holding a ticker absent from the user's holdings still contributes that ticker's `sector` and `riskRating`, proving the widened `asset` include is wired through; (4) a `rawText` longer than the budget is truncated and the prompt says so; (5) no `advisorReportId` produces a valid prompt with block 2 omitted entirely rather than an empty heading; (6) a holding whose `Asset.currentPrice` exceeds its `limitPrice` in a recommended wallet has both numbers present in the prompt for that ticker — the deterministic half of the spec AC "When at least one held ticker's `currentPrice` exceeds its `limitPrice` … the generated `risks[]` or `recommendations[]` reflects that". The other half is model output and is a manual spot-check by the spec's own wording, so this assertion pins what code can actually guarantee: that the model was *given* the discrepancy. Confirm red first, then green.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
