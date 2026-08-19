# RECOMMENDED_PORTFOLIOS_US-2_T-1: every upload is additive

**Story:** [../stories/US-2-version-history.md](../stories/US-2-version-history.md)
**Status:** Done
**GitHub Issue:** #149 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** RECOMMENDED_PORTFOLIOS_US-1_T-6

Prove the spec's version-history guarantee — *"every upload creates a new snapshot rather than overwriting the previous one, so past AI analyses stay reproducible against the exact wallet version they used"* — directly, rather than inferring it from `GET .../latest` happening to return the right row.

This may well pass with no production change if `RECOMMENDED_PORTFOLIOS_US-1_T-6` was implemented as a plain nested `create`. **That is a valid green** — say so rather than manufacturing a change to justify the task. It exists separately because the failure mode is invisible and unrecoverable: upserting on `(userId, walletType)` or on `(walletType, effectiveDate)` looks correct, passes every upload test in US-1, and silently destroys the property the module exists for. Nothing surfaces until someone tries to reproduce an old `AdvisorAnalysis` and finds the wallet it referenced was overwritten — by which point the prior snapshots are gone.

`RECOMMENDED_PORTFOLIOS_SHARED_T-1` deliberately leaves `(walletType, effectiveDate)` non-unique for this reason; that absence is what this task pins.

**Test:** `apps/api/test/recommended-portfolios.e2e-spec.ts` (extends the file from `RECOMMENDED_PORTFOLIOS_US-1_T-6`) — with a session cookie, uploading the Dividends fixture:

1. **Spec AC-10, first half** — uploading twice with **different** `effectiveDate`s leaves exactly **2** `RecommendedPortfolio` rows for that wallet.
2. The first snapshot is **untouched** after the second upload: re-read it by id and assert its `effectiveDate` and its holdings' `limitPrice`/`recommendation` still match the first upload, not the second. A row count alone passes an implementation that adds a row *and* mutates the old one — so vary something between the two uploads (a modified fixture with a different `PRECO_TETO`) and assert the old row kept the old value.
3. **Spec AC-11, first half** — uploading twice with the **same** `effectiveDate` also yields 2 rows. The additive rule has no same-day exception, and this is the case a `(walletType, effectiveDate)` unique constraint would break.
4. Uploading a different wallet type leaves the `DIVIDENDS` snapshots untouched.

Confirm red first by making the assertions fail for the right reason: temporarily change the create to an upsert keyed on `(userId, walletType)` and watch cases 1–3 fail, then revert. A guarantee test that would pass even with the guarantee broken is worth nothing, and here that is invisible in the final diff.

**Done when:** the tests above pass, and the red-first check above has been performed.
