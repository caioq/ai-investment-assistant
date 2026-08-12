# PORTFOLIO_US-3_T-2: GET /portfolio/allocation

**Story:** [../stories/US-3-allocation.md](../stories/US-3-allocation.md)
**Status:** Done
**GitHub Issue:** #107 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_US-3_T-1, PORTFOLIO_US-1_T-1

Add `GET /portfolio/allocation?by=sector|subsector|stock|investmentStyle|riskRating` returning `[{ label, value, pct, color }]`, per the spec's API Contract.

Load the user's holdings joined with `Asset` (same `userId`-scoped query as `PORTFOLIO_US-1_T-2`), map each to `{ label, value }`, and hand the array to `computeAllocation` from `PORTFOLIO_US-3_T-1`. All grouping, percentage, sorting, and colour logic lives in `packages/shared` — the controller/service only picks the label field and computes each holding's value.

Label per `by=` value: `sector` → `asset.sector`, `subsector` → `asset.subSector`, `stock` → `asset.ticker`, `investmentStyle` → `asset.investmentStyle`, `riskRating` → `asset.riskRating`. The last three come back `null` for unclassified assets; pass the `null` straight through — `computeAllocation` is what turns it into `"Unclassified"`, and duplicating that here would let the two drift.

**`value` is the holding's current market value**, `quantity × (asset.currentPrice ?? holding.avgPrice)` — the same `avgPrice` fallback the spec's Behavior Notes define and `PORTFOLIO_US-4_T-1` uses. Use `??`, not `||`: a legitimately-zero `currentPrice` would otherwise silently fall back to `avgPrice`. Allocating on `avgPrice` alone would show the concentration the user *bought*, not the one they *have*, which is the opposite of what the AI Advisor needs.

Validate `by` against the five allowed values and return `400` for anything else — an unrecognised value must not silently fall through to one grouping or produce a single `"Unclassified"` slice. A `class-validator` `@IsIn([...])` query DTO behind the global `ValidationPipe` does this without a manual check.

**Test:** `apps/api/test/portfolio.e2e-spec.ts` (extends the file from earlier tasks) — with a session cookie and holdings seeded across two sectors with known prices:

1. `?by=sector` returns `200`, one slice per sector, and the `pct` values sum to `100` — spec AC-4 through the real HTTP path (the arithmetic edge cases are already pinned in `PORTFOLIO_US-3_T-1`'s unit test; this proves the wiring).
2. `?by=stock` returns one slice per ticker.
3. `?by=riskRating` with assets whose `riskRating` is `null` returns an `"Unclassified"` slice, and the summed `value` across slices equals the portfolio's total value — nothing is dropped.
4. A holding whose `Asset.currentPrice` is `null` still contributes `quantity × avgPrice` rather than `0`.
5. `?by=bogus` returns `400`.
6. No auth cookie returns `401`.

Confirm red first (no route exists, so the request 404s), then green.

**Done when:** the test above passes — case 4 especially, since on a fresh account every asset is unpriced until the next cron run, and without the fallback every slice would be `0` and `pct` would be `NaN`.
