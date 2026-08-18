# RECOMMENDED_PORTFOLIOS_US-1_T-4: whole-file validation

**Story:** [../stories/US-1-ingest-wallet-export.md](../stories/US-1-ingest-wallet-export.md)
**Status:** Not Started
**GitHub Issue:** #146 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** RECOMMENDED_PORTFOLIOS_US-1_T-3

Validate the normalised rows and, on any failure, reject the **entire upload** with a `BadRequestException` whose message names every offending row — per the spec's Behavior Note.

Reject a row for: a `targetWeightPct` present but outside `0–100` inclusive, a non-numeric value where a number was published (the failure result from `parseBrazilianNumber`), an unrecognised `RECOMENDACAO`, or an empty `EMPRESA` (the one field every row must have — it's the only identifier a tickerless row carries).

Do **not** reject a row for an empty `CODIGO` (that's the fixed-income line), an absent `ALOCACAO_SUGERIDA` (Dividends and Small Caps don't publish it), or an absent `MARGEM_DE_SEGURANCA` (Overall doesn't). Each of those is a legitimate shape of a real export, and rejecting any one of them makes a whole wallet unimportable.

**Report every failure in one response.** Failing on the first bad row means a user with three mistakes fixes them one upload at a time.

**This deliberately differs from `PortfolioService.importHoldingsCsv`, which accepts partial success.** A holdings CSV is a bag of independent positions, so importing 3 of 4 is useful. A wallet is a set that only means something whole: storing 8 of 10 rows produces a snapshot misrepresenting what the research house published, which [advisor](../../advisor/spec.md) then reasons over as complete with nothing signalling the gap. A reviewer arriving from the portfolio module will expect the opposite behaviour — that's why the spec states it and this task restates it.

Note the spec explicitly does **not** validate that weights sum to 100: a research house may publish a partially-allocated wallet, and rescaling or rejecting would misrepresent it.

**Test:** `apps/api/src/recommended-portfolios/recommended-portfolios.service.spec.ts` — a unit test with a mocked `PrismaService`, per `CONVENTIONS.md` → "Testing":

1. **Spec AC-8** — a fixture-derived CSV with one `ALOCACAO_SUGERIDA` of `"150,00%"` rejects, the error names that row's number, and **no** `recommendedPortfolio.create` is issued on the mocked Prisma. Assert the write never happened, not just the status.
2. `"-5,00%"` rejects the same way — the bound is two-sided, and `> 100` is the half people remember.
3. A file with **two** bad rows produces one error naming **both** row numbers.
4. **Spec AC-4** — an unrecognised `RECOMENDACAO` rejects the upload.
5. All three unmodified fixtures validate clean — no false positives from the tickerless row, the absent `ALOCACAO_SUGERIDA` in two files, or the absent `MARGEM_DE_SEGURANCA` in Overall.
6. A wallet whose weights sum to 60 validates clean, per the spec's Non-Goal.

Confirm red first (no validation exists), then green.

**Done when:** the test above passes — case 1's "nothing was written" assertion and case 5 in particular. The first catches an implementation that validates *while* inserting and returns the right error having already persisted a partial wallet; the second catches over-strict validation that rejects the real exports, which is the more likely mistake here.
