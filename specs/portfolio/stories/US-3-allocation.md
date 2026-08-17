# US-3: See where my money is concentrated

**Status:** Ready
**Traces to:** spec Goal "Compute allocation by sector, sub-sector, stock, investment style, and risk rating." / AC "`GET /portfolio/allocation?by=sector` percentages sum to 100 (within floating-point tolerance)." (in `../spec.md`)

As an investor, I want my portfolio broken down by sector, stock, style, and risk, so I can see concentration I didn't intend — which is the main input the AI Advisor reasons about.

## Tasks

- [x] [T-1: computeAllocation in packages/shared](../tasks/PORTFOLIO_US-3_T-1-allocation-shared.md)
- [ ] [T-2: GET /portfolio/allocation](../tasks/PORTFOLIO_US-3_T-2-allocation-endpoint.md)

## Notes

The grouping math is a **pure function in `packages/shared`**, per `CLAUDE.md` → Conventions ("allocation math … belongs in `packages/shared`, not duplicated between `apps/web` and `apps/api`"). That's what lets AC-4's "percentages sum to 100" be tested directly against arrays, including the cases that actually break it — a single holding (must be exactly 100, not 99.99999), and three equal holdings (33.33 × 3, where naive rounding gives 99.99).

**Two of the five groupings are nullable.** `investmentStyle` and `riskRating` are optional on `Asset` and market-data never writes them, so in practice they'll be `null` for most assets on day one. T-1 groups those under an explicit `"Unclassified"` label rather than dropping them — silently omitting them would make the percentages sum to 100 across a *subset* of the portfolio, which is worse than a visibly large unclassified slice because it looks correct.

`color` is derived from the label rather than the slice's position — see `README.md` → "Decisions this pass had to make" for why index-based assignment is a trap here.

T-1 has **no dependencies** and can start immediately, in parallel with the schema and module tasks.
