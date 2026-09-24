# US-4: Import a model wallet

**Status:** Ready
**Traces to:** spec Goals "Source cards showing real state" (per-wallet versions) and "An import gate"; ACs "A wallet CSV containing one invalid row renders **no** skip checkbox …", "A wallet CSV whose `ALOCACAO_SUGERIDA` sums to 92% …", "Importing the same wallet twice leaves two versions …" (in `../spec.md`)

As someone following a research house, I want to import each model wallet and see which version is current, so that the advisor compares my portfolio against the right recommendations.

## Tasks

- [x] [T-1: Wallet type selector and detail fields](../tasks/DATA_SOURCES_US-4_T-1-wallet-selector-and-details.md)
- [ ] [T-2: Wallet import, all-or-nothing gate and weights warning](../tasks/DATA_SOURCES_US-4_T-2-wallet-import-and-gate.md)

Shared tasks this story relies on: [SHARED_T-1](../tasks/DATA_SOURCES_SHARED_T-1-parse-csv.md), [SHARED_T-2](../tasks/DATA_SOURCES_SHARED_T-2-shared-validators.md), [SHARED_T-4](../tasks/DATA_SOURCES_SHARED_T-4-import-log.md), [SHARED_T-6](../tasks/DATA_SOURCES_SHARED_T-6-drop-zone-and-file-chip.md), [SHARED_T-7](../tasks/DATA_SOURCES_SHARED_T-7-csv-review.md), [SHARED_T-8](../tasks/DATA_SOURCES_SHARED_T-8-import-footer-and-banner.md), [SHARED_T-9](../tasks/DATA_SOURCES_SHARED_T-9-csv-templates.md).

## Notes

- **The wallet endpoint is all-or-nothing**: one bad row rejects the whole file. So this is the one source with no skip checkbox, and the gate requires zero row errors. Never work around it by uploading a filtered, re-serialized CSV.
- Each wallet type keeps its own pending file (`wallet:{type}`), so switching types mid-upload doesn't discard one.
- Uploading creates a **new version**; earlier ones stay. The panel's copy says so.
