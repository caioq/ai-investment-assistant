# PORTFOLIO_US-4_T-1: GET /portfolio/summary

**Story:** [../stories/US-4-summary.md](../stories/US-4-summary.md)
**Status:** Not Started
**GitHub Issue:** #108 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** PORTFOLIO_SHARED_T-1, PORTFOLIO_SHARED_T-2, PORTFOLIO_US-1_T-1

Add `GET /portfolio/summary` returning `{ totalInvested, currentValue, gainLoss, returnPct }`, per the spec's API Contract, over the user's `userId`-scoped holdings joined with `Asset`:

- `totalInvested` = `Σ quantity × avgPrice`
- `currentValue` = `Σ quantity × (asset.currentPrice ?? holding.avgPrice)`
- `gainLoss` = `currentValue − totalInvested`
- `returnPct` = `gainLoss / totalInvested × 100`

**Two traps live in the `currentValue` line.** Writing `||` instead of `??` makes a legitimately-zero `currentPrice` fall back to `avgPrice`; omitting the fallback entirely makes an unpriced holding contribute `0`, so a brand-new account reads as "my portfolio is worth nothing" until the next cron run. The spec's Behavior Notes are explicit that `avgPrice` stands in "only until market-data populates `Asset.currentPrice` for that ticker".

**Return zeros for an empty portfolio**, not `NaN`. `returnPct` divides by `totalInvested`, which is `0` with no holdings; `NaN` serialises to `null` in JSON and surfaces as a blank dashboard tile with nothing in the logs to explain it. Guard the division explicitly.

**Test:** `apps/api/test/portfolio.e2e-spec.ts` (extends the file from earlier tasks) — with a session cookie:

1. **Spec AC-5, hand-computed.** Seed two holdings with known values — 100 × `avgPrice` 30 with `currentPrice` 33, and 50 × `avgPrice` 20 with `currentPrice` 18 — and assert exactly `totalInvested: 4000`, `currentValue: 4200`, `gainLoss: 200`, `returnPct: 5`. Fixture chosen so a swapped `currentPrice`/`avgPrice` or a dropped holding cannot coincidentally produce the same numbers.
2. **Mixed priced/unpriced.** Add a third holding whose `Asset.currentPrice` is `null` (10 × `avgPrice` 15): `totalInvested` becomes `4150` and `currentValue` `4350` — the unpriced holding contributes `150` via the fallback, not `0`.
3. A user with no holdings gets `200` and all four fields `0` — no `NaN`, no `null`.
4. Deleting a holding changes the summary accordingly — spec AC-6's "and from subsequent … summary calculations" half.
5. No auth cookie returns `401`.

Confirm red first (no route exists, so the request 404s), then green.

**Done when:** the test above passes — cases 2 and 3 in particular, since a straightforward implementation gets case 1 right and still breaks on a fresh or empty account, which is every user's first experience of the product.
