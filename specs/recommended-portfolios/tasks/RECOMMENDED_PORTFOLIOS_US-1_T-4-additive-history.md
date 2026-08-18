# RECOMMENDED_PORTFOLIOS_US-1_T-4: every upload is additive

**Story:** [../stories/US-1-upload-wallet-csv.md](../stories/US-1-upload-wallet-csv.md)
**Status:** Not Started
**GitHub Issue:** #136 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** RECOMMENDED_PORTFOLIOS_US-1_T-3

Prove the spec's version-history guarantee — *"every upload creates a new snapshot rather than overwriting the previous one, so past AI analyses stay reproducible against the exact wallet version they used"* — directly, rather than inferring it from `GET .../latest` happening to return the right row.

This is a **test-first guarantee task**, and it may well pass without a production change if `RECOMMENDED_PORTFOLIOS_US-1_T-3` was implemented as a plain `create`. That's a valid green — say so rather than manufacturing a change. It exists separately because the failure mode is invisible and unrecoverable: upserting on `(userId, walletType)` or `(walletType, effectiveDate)` looks correct, passes every upload test, and silently destroys the property the module exists for. By the time anyone notices, the overwritten snapshots are gone, and every `AdvisorAnalysis` that referenced them is unreproducible.

`RECOMMENDED_PORTFOLIOS_SHARED_T-1` deliberately leaves `(walletType, effectiveDate)` non-unique for this reason; that absence is what this task pins.

**Test:** `apps/api/test/recommended-portfolios.e2e-spec.ts` (extends the file from `RECOMMENDED_PORTFOLIOS_US-1_T-3`) — with a session cookie:

1. **Spec AC-1's first half** — uploading twice for `?wallet=DIVIDENDS` with **different** `effectiveDate`s leaves exactly **2** `RecommendedPortfolio` rows for that wallet.
2. The first snapshot is **byte-for-byte untouched** after the second upload: re-read it by id and assert its `effectiveDate` and its holdings' `targetWeightPct`/`limitPrice` still match the first CSV, not the second. A row count alone would pass an implementation that added a row *and* mutated the old one.
3. Uploading twice with the **same** `effectiveDate` also yields 2 rows — the additive rule has no same-day exception, and this is the case a `(walletType, effectiveDate)` unique constraint would break.
4. Uploading a different wallet type doesn't disturb `DIVIDENDS`' snapshots.

Confirm red first by making the assertion fail for the right reason: temporarily change the create to an upsert keyed on `(userId, walletType)` and watch cases 1–3 fail, then revert. A guarantee test that would pass even with the guarantee broken is worth nothing, and here that's invisible in the final diff.

**Done when:** the tests above pass, and the red-first check above has been performed.
