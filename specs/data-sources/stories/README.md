# Data Sources — Stories Index

**Spec:** [../spec.md](../spec.md)

One row per story. Keep this file in sync whenever a story is added or its status changes — it's the only place to see the module's story-level picture without opening every file.

| Story | Title | Status | Tasks |
|---|---|---|---|
| [US-1](./US-1-see-whats-imported.md) | See what's already imported | Done | T-1..T-2 in `../tasks/` |
| [US-2](./US-2-import-assets.md) | Import the assets CSV | Done | T-1 in `../tasks/` |
| [US-3](./US-3-import-holdings.md) | Import the holdings CSV | Draft | T-1 in `../tasks/` |
| [US-4](./US-4-import-model-wallet.md) | Import a model wallet | Done | T-1..T-2 in `../tasks/` |
| [US-5](./US-5-add-research-report.md) | Add a research report | Done | T-1..T-2 in `../tasks/` |
| [US-6](./US-6-import-history.md) | See what was imported before | Done | T-1 in `../tasks/` |
| [US-7](./US-7-retire-old-upload-ui.md) | Retire the old upload controls | Ready | T-1..T-2 in `../tasks/` |

Build order: the `SHARED` foundations first (T-1..T-9), then US-1, then US-2 (which establishes the panel shape every other source reuses), then US-3/US-4/US-5 in parallel, then US-6, US-7, and `SHARED_T-10` last. Each task's `**Depends on:**` field is authoritative.

**US-3 is `Draft` on purpose** — see its Notes. It cannot be built until the portfolio module's header-name holdings parser lands (PR #176); building the preview against today's positional parser would validate a format the server doesn't accept.

## Cross-cutting tasks

| Task | Title | Shared by |
|---|---|---|
| [DATA_SOURCES_SHARED_T-1](../tasks/DATA_SOURCES_SHARED_T-1-parse-csv.md) | `parseCsv` in `packages/shared` | US-2, US-3, US-4 |
| [DATA_SOURCES_SHARED_T-2](../tasks/DATA_SOURCES_SHARED_T-2-shared-validators.md) | Shared row validators | US-2, US-3, US-4 |
| [DATA_SOURCES_SHARED_T-3](../tasks/DATA_SOURCES_SHARED_T-3-api-uses-shared-validators.md) | API importers consume the shared validators | US-2, US-3, US-4 |
| [DATA_SOURCES_SHARED_T-4](../tasks/DATA_SOURCES_SHARED_T-4-import-log.md) | `ImportLog` model + `/data-sources/imports` | US-2, US-3, US-4, US-5, US-6 |
| [DATA_SOURCES_SHARED_T-5](../tasks/DATA_SOURCES_SHARED_T-5-summary-endpoint.md) | `GET /data-sources/summary` | US-1, US-2, US-3, US-4, US-5 |
| [DATA_SOURCES_SHARED_T-6](../tasks/DATA_SOURCES_SHARED_T-6-drop-zone-and-file-chip.md) | `DropZone` + `FileChip` primitives | US-2, US-3, US-4, US-5 |
| [DATA_SOURCES_SHARED_T-7](../tasks/DATA_SOURCES_SHARED_T-7-csv-review.md) | `CsvReview` (summary, columns, preview, issues) | US-2, US-3, US-4 |
| [DATA_SOURCES_SHARED_T-8](../tasks/DATA_SOURCES_SHARED_T-8-import-footer-and-banner.md) | `ImportFooter` gate + `Banner` | US-2, US-3, US-4, US-5 |
| [DATA_SOURCES_SHARED_T-9](../tasks/DATA_SOURCES_SHARED_T-9-csv-templates.md) | CSV template download | US-2, US-3, US-4 |
| [DATA_SOURCES_SHARED_T-10](../tasks/DATA_SOURCES_SHARED_T-10-e2e-and-visual-baselines.md) | Playwright flow + visual baselines | all |

## Out of scope for this pass

Nothing from the spec's Goals was deferred. The spec's Non-Goals (dark theme, "Use sample file", rollback, PDF extraction beyond `rawText`, broker sync, replace semantics, the report paste-text path, manual single-holding entry) get no stories.
