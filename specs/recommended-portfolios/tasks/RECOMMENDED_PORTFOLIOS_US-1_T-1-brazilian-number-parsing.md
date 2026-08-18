# RECOMMENDED_PORTFOLIOS_US-1_T-1: Brazilian number parsing

**Story:** [../stories/US-1-ingest-wallet-export.md](../stories/US-1-ingest-wallet-export.md)
**Status:** Not Started
**GitHub Issue:** #143 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Add a pure helper — `parseBrazilianNumber(raw: string | undefined): number | null` — that turns the exports' published values into numbers, per the spec's Behavior Note on Brazilian formatting.

Handles: a currency prefix (`"R$ 40,99"` → `40.99`), a percent suffix (`"8,00%"` → `8`), negatives (`"-6,71%"` → `-6.71`), and the **`.` thousands separator** (`"R$ 1.234,56"` → `1234.56`). An empty or whitespace-only value returns `null` — that's how an absent column arrives, and it must not become `0`. A value that isn't a number after normalisation (`"abc"`, `"R$"`) returns a distinguishable failure so `RECOMMENDED_PORTFOLIOS_US-1_T-4` can reject the row rather than storing a silent `null`.

This is a separate task because it is the single most load-bearing line in the module: `Number("8,00%")` is `NaN`, so a normal numeric parse rejects **every row of every real export**. Isolating it means its edge cases can be stated in one line each instead of assembling a whole CSV per case.

The thousands separator deserves particular care, and is the one case the real files don't currently exercise — every published price today is under R$ 100. An implementation that only strips `,` passes on all three real exports and silently turns `"R$ 1.234,56"` into `1.23456` or `NaN` the first time a wallet holds an expensive ticker. Strip `.` before converting `,` to `.`, not after.

Keep it in `apps/api/src/recommended-portfolios/` rather than `packages/shared` — nothing in `apps/web` parses these files today, and `CLAUDE.md` puts logic in `shared` when both apps need it, not speculatively.

**Test:** `apps/api/src/recommended-portfolios/brazilian-number.spec.ts` — a table-driven unit test, no Prisma or Nest involved:

1. `"R$ 40,99"` → `40.99`; `"R$ 1.234,56"` → `1234.56` (the thousands case).
2. `"8,00%"` → `8`; `"-6,71%"` → `-6.71`; `"0,00%"` → `0`.
3. `""`, `"   "` and `undefined` → `null` — **not** `0`, since that's how an absent column arrives and `0` would read as a real published value.
4. `"abc"` and `"R$"` → the failure result, distinguishable from `null`.
5. A plain `"12.5"` (already in en-US form) does not silently become `125` — assert whichever behaviour is chosen and document it; the exports never produce this, so it must not be left ambiguous.

Confirm red first (no helper exists), then green.

**Done when:** the test above passes — cases 1 (thousands) and 3 (`null` vs `0`) in particular, since an implementation that handles only the real files' current values passes everything else.
