# US-2: Import the assets CSV

**Status:** Done
**Traces to:** spec Goals "Check before importing", "An import gate"; ACs "An assets CSV of 10 rows where 2 carry an unrecognised `riskRating` …", "Unchecking skip …", "An assets CSV with no `ticker` header …", "A successful assets import clears the file …" (in `../spec.md`)

As someone classifying my portfolio, I want to import the assets CSV and see exactly what will happen before I commit, so that a bad row doesn't silently change how every allocation view is grouped.

## Tasks

- [x] [T-1: Assets import panel](../tasks/DATA_SOURCES_US-2_T-1-assets-import-panel.md)

Shared tasks this story relies on: [SHARED_T-1](../tasks/DATA_SOURCES_SHARED_T-1-parse-csv.md), [SHARED_T-2](../tasks/DATA_SOURCES_SHARED_T-2-shared-validators.md), [SHARED_T-4](../tasks/DATA_SOURCES_SHARED_T-4-import-log.md), [SHARED_T-6](../tasks/DATA_SOURCES_SHARED_T-6-drop-zone-and-file-chip.md), [SHARED_T-7](../tasks/DATA_SOURCES_SHARED_T-7-csv-review.md), [SHARED_T-8](../tasks/DATA_SOURCES_SHARED_T-8-import-footer-and-banner.md), [SHARED_T-9](../tasks/DATA_SOURCES_SHARED_T-9-csv-templates.md).

## Notes

- **This task establishes the panel shape every other source reuses** — details slot, drop zone, review, footer, banner, then log + refresh on success. US-3, US-4 and US-5 compose the same pieces rather than inventing their own.
- Assets are **global**: importing changes classification for every user. The panel says so in one line (spec → Data ownership).
- The assets endpoint imports valid rows and returns the rest in `errors[]`, so the skip checkbox maps to real behaviour here.
