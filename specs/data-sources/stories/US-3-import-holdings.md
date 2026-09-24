# US-3: Import the holdings CSV

**Status:** Done
**Traces to:** spec Goal "Check before importing"; ACs "A holdings CSV with tickers absent from `Asset` shows one warning row per such ticker and still imports" and "After importing assets, re-checking that same holdings file shows no unknown-ticker warnings, without a page reload" (in `../spec.md`)

As an investor, I want to import my broker's holdings export and see which tickers the app won't recognise, so that I find out before my dashboard shows positions as Unclassified.

## Tasks

- [x] [T-1: Holdings import panel](../tasks/DATA_SOURCES_US-3_T-1-holdings-import-panel.md)

Shared tasks this story relies on: [SHARED_T-1](../tasks/DATA_SOURCES_SHARED_T-1-parse-csv.md), [SHARED_T-2](../tasks/DATA_SOURCES_SHARED_T-2-shared-validators.md), [SHARED_T-4](../tasks/DATA_SOURCES_SHARED_T-4-import-log.md), [SHARED_T-6](../tasks/DATA_SOURCES_SHARED_T-6-drop-zone-and-file-chip.md), [SHARED_T-7](../tasks/DATA_SOURCES_SHARED_T-7-csv-review.md), [SHARED_T-8](../tasks/DATA_SOURCES_SHARED_T-8-import-footer-and-banner.md), [SHARED_T-9](../tasks/DATA_SOURCES_SHARED_T-9-csv-templates.md), [SHARED_T-11](../tasks/DATA_SOURCES_SHARED_T-11-holdings-validator-matches-server.md).

## Notes

- **Built against the server's current format, on purpose.** `POST /portfolio/holdings/upload-csv` parses three columns **by position** — `ticker`, `quantity`, `avgPrice` — with plain decimal numbers, while [portfolio](../../portfolio/spec.md) specifies a different, header-name Brazilian format that PR #176 would build. Rather than block on that, this story targets what the server does today (spec → "The holdings format is interim, on purpose"), so the preview and the import agree.
- **The cost is honesty about the real export.** A user's actual 23-column broker file is rejected in the preview — every row "expected 3 columns … got 23" — because the server would reject it too. That is the correct answer today, not a bug in this story.
- **`SHARED_T-11` comes first**: it makes the shared validator positional, exposes raw row cells from `parseCsv`, and adds the parity test that keeps the preview and the server in step. Without it the preview would promise things the server refuses.
- **Temporary.** When portfolio's parser lands, the validator, template and hint copy move to the target format in the same change that swaps the server's parser. That migration belongs to the portfolio work, not to this story.
- Import **upserts**: positions absent from the file are left alone. The panel's copy must not say "replaces".
