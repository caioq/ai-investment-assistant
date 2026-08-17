# US-4: See what my portfolio is worth

**Status:** Done
**Traces to:** spec Goal "Compute portfolio summary (invested, current value, gain/loss, return %)…" / AC "`GET /portfolio/summary` matches a hand-computed value for a seeded set of holdings with known prices." (in `../spec.md`)

As an investor, I want one line telling me what I put in, what it's worth now, and whether I'm up or down, so I don't have to add it up myself.

## Tasks

- [x] [T-1: GET /portfolio/summary](../tasks/PORTFOLIO_US-4_T-1-summary-endpoint.md)

## Notes

One task, because the endpoint is four arithmetic reductions over the same joined rows `GET /portfolio/holdings` already loads — splitting it would create two files that always change together.

**The `avgPrice` fallback is the part worth testing carefully.** Per the spec's Behavior Notes, `avgPrice` stands in as the current price *only until* market-data populates `Asset.currentPrice` for that ticker. So `currentValue` is `Σ quantity × (asset.currentPrice ?? holding.avgPrice)`. Two traps live in that one line: writing `||` instead of `??` makes a legitimately-zero price fall back to `avgPrice`, and forgetting the fallback entirely makes a brand-new holding contribute `0` to portfolio value until the next cron run — which reads as "my portfolio lost everything" on a fresh account. AC-5's hand-computed fixture deliberately mixes priced and unpriced assets so neither passes.

`returnPct` is `gainLoss / totalInvested`, which is division by zero for a user with no holdings. T-1 returns zeros for the empty portfolio rather than `NaN` — `NaN` serialises to `null` in JSON and surfaces as a blank dashboard tile with no error anywhere.
