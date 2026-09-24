# DATA_SOURCES_US-4_T-2: Wallet import, all-or-nothing gate and weights warning

**Story:** [../stories/US-4-import-model-wallet.md](../stories/US-4-import-model-wallet.md)
**Status:** Done
**GitHub Issue:** #322 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** DATA_SOURCES_US-4_T-1, DATA_SOURCES_US-2_T-1, DATA_SOURCES_SHARED_T-2

Wire the **model wallets** source through `ImportPanel`: title "Import model wallet · {type}", copy saying the upload creates a **new version** and keeps earlier ones, required columns `CODIGO` and `PRECO_TETO`, and `POST /advisor/recommended-portfolios/upload?wallet={type}` with `effectiveDate` and `sourceName` in the same `FormData`.

Two rules specific to this source:
- **Skipping is unavailable.** The endpoint rejects the whole file on one bad row, so `ImportFooter` gets `skipAvailable={false}`: no checkbox, and any row error disables the button with "Fix the errors and re-upload — a wallet file is imported all at once." Never upload a filtered, re-serialized CSV.
- **Weights warning.** `ALOCACAO_SUGERIDA` summing outside 100% ± 0.5% is a file-level warning naming the actual total, and it does **not** block the import.

On success, log `{ source: 'WALLET', walletType, records: holdings.length }` and show "Imported {n} positions into the {type} wallet." Refresh the summary so the selector's dot and version note update.

**Test:** `apps/web/components/data-sources/ImportPanel.wallet.test.tsx` (Vitest + RTL):
1. A file with one invalid `RECOMENDACAO` renders **no** skip checkbox, disables the button, and shows the wallet hint.
2. A clean file whose weights sum to 92 imports, showing a file warning containing "92" and an enabled button.
3. Import posts to `/advisor/recommended-portfolios/upload?wallet=DIVIDENDS` with `effectiveDate` and `sourceName` in the FormData.
4. Success logs an `ImportLog` carrying `walletType` and shows the version-created banner.
5. Attaching a file under `DIVIDENDS`, switching to `SMALL_CAPS` and back leaves the first file attached.
6. The panel's copy says a new version is created and earlier versions are kept.

**Done when:** the test above exists and passes, following red-green TDD — write it first, run it and confirm it fails for the expected reason (not a typo/setup error), then implement until it passes.
