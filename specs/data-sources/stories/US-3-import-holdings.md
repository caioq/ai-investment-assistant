# US-3: Import the holdings CSV

**Status:** Draft
**Traces to:** spec Goal "Check before importing"; ACs "A holdings CSV with tickers absent from `Asset` shows one warning row per such ticker and still imports" and "After importing assets, re-checking that same holdings file shows no unknown-ticker warnings, without a page reload" (in `../spec.md`)

As an investor, I want to import my broker's holdings export and see which tickers the app won't recognise, so that I find out before my dashboard shows positions as Unclassified.

## Tasks

- [ ] [T-1: Holdings import panel](../tasks/DATA_SOURCES_US-3_T-1-holdings-import-panel.md)

Shared tasks this story relies on: [SHARED_T-1](../tasks/DATA_SOURCES_SHARED_T-1-parse-csv.md), [SHARED_T-2](../tasks/DATA_SOURCES_SHARED_T-2-shared-validators.md), [SHARED_T-4](../tasks/DATA_SOURCES_SHARED_T-4-import-log.md), [SHARED_T-6](../tasks/DATA_SOURCES_SHARED_T-6-drop-zone-and-file-chip.md), [SHARED_T-7](../tasks/DATA_SOURCES_SHARED_T-7-csv-review.md), [SHARED_T-8](../tasks/DATA_SOURCES_SHARED_T-8-import-footer-and-banner.md), [SHARED_T-9](../tasks/DATA_SOURCES_SHARED_T-9-csv-templates.md).

## Notes

- **Deliberately left `Draft`, and blocked.** `POST /portfolio/holdings/upload-csv` still parses the old positional `ticker,quantity,avgPrice` form, while [portfolio](../../portfolio/spec.md) specifies header-name columns `Ticker`, `Quantidade`, `Preco Médio` with Brazilian number formatting. PR #176 reopens portfolio US-2 to build that. Until it lands, this story's preview would validate a format the server doesn't accept — exactly the drift the shared parser exists to prevent.
- Move this story to `Ready` once the portfolio parser is merged, and confirm `SHARED_T-2`'s `validateHoldingsRows` matches it before implementing T-1.
- Import **upserts**: positions absent from the file are left alone. The panel's copy must not say "replaces".
