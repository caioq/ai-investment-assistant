# Data Sources

**Status:** Approved
**Depends on:** [project-setup](../project-setup/spec.md), [auth](../auth/spec.md), [market-data](../market-data/spec.md), [portfolio](../portfolio/spec.md), [recommended-portfolios](../recommended-portfolios/spec.md), [advisor](../advisor/spec.md), [dashboard-ui](../dashboard-ui/spec.md)

## Problem

Everything the app knows comes from four files the user imports, but there is nowhere to do that. The holdings CSV upload sits on `/holdings`, the research report and model wallet uploads are buried inside the dashboard's advisor panel, and the assets CSV — the file that classifies every ticker, and therefore drives every allocation view — has **no UI at all**. Each of them is a bare file input that reports what went wrong only after the file has already been sent, and nothing anywhere shows what was imported, when, or whether the next file will import cleanly.

## Goals

- **One page, `/data-sources`**, inside the `(dashboard)` route group, covering all four sources: Assets (CSV), Holdings (CSV), Model wallets (CSV, three wallet types), Research report (PDF).
- **Source cards showing real state** — asset and holding counts, when each was last imported, which wallets have a version, and the current report. Selecting a card opens that source's import panel. Each source keeps its own pending file, so switching cards never discards an attached file.
- **Attach by drag-and-drop or file browser**, with the accepted file type enforced per source.
- **Check before importing.** A CSV is parsed and validated **in the browser, with the same code the server uses**, and the user sees a summary, the required-column check, file-level issues, every row in a preview table, and a list of issues before anything is uploaded.
- **An import gate** that only enables the button when the file can actually be imported, and says which rule is unmet when it can't.
- **An import history** that survives a reload, backed by a real table.
- **A downloadable CSV template** per source, and per wallet type.
- **Move the existing upload UI here** and delete it from the dashboard and holdings pages.
- Accessibility: a keyboard-operable drop zone, results announced politely, and status never conveyed by colour alone.

## Non-Goals

- **Dark theme and the theme toggle.** Deferred app-wide, consistent with [dashboard-ui](../dashboard-ui/spec.md) and [auth-ui](../auth-ui/spec.md). One page shipping its own palette is worse than no dark mode.
- **Replace semantics.** The design this page came from assumed a holdings import wipes existing positions, a wallet upload replaces the current version, and a report replaces the "active" one. **None of that is how the backend works**, and this spec does not change it — see Behavior Notes → Import effects.
- **"Use sample file".** A prototype affordance for demoing validation paths; it loads deliberately broken data and has no place in the product.
- **Rollback / restore a previous version** from the history table.
- **Anything beyond the existing PDF text extraction.** No "sectors referenced" panel, no indexing, no malware scanning: `extractPdfText` already produces `rawText`, and that's all the advisor consumes.
- **Broker API connections**, and any per-source "freshness" or health indicator (no rule exists for what stale means).
- **The report paste-text path.** `POST /advisor/reports/upload` also accepts `{ sourceName, text }`, but **the report panel is PDF-only** — a decided trade-off, not an oversight. Deleting `AdvisorReportUpload` therefore removes the only UI for pasting report text. The endpoint keeps accepting it, so nothing breaks for an API caller and the path can be given a UI later if it's ever missed.
- **Manual single-holding entry.** `AddHoldingForm` is deleted rather than moved: it types one position by hand, which is not importing a data source.

## Data Model

Two additive changes. No existing column changes type or meaning.

```prisma
enum ImportSource {
  ASSETS
  HOLDINGS
  WALLET
  REPORT
}

enum ImportStatus {
  IMPORTED
  FAILED
}

/// One row per import attempt, written by the page after an upload resolves.
/// This is the only record of an assets import: `Asset` has no timestamps,
/// so "last imported" cannot be derived from the rows themselves.
model ImportLog {
  id         String       @id @default(uuid(7)) @db.Uuid
  userId     String       @map("user_id") @db.Uuid
  user       User         @relation(fields: [userId], references: [id])
  source     ImportSource
  walletType WalletType?  @map("wallet_type") // set only when source = WALLET
  fileName   String       @map("file_name")
  records    Int          // rows written (created + updated); 1 for a report
  status     ImportStatus
  message    String?      // why the import failed outright; null on success
  /// Every row the server rejected, verbatim from its `errors[]`. Kept on
  /// IMPORTED rows too: an assets/holdings import partially succeeds, so
  /// "Imported 28" can coexist with 12 rejected rows, and the history would
  /// otherwise hide them once the banner is dismissed.
  errors     Json?        // string[]
  createdAt  DateTime     @default(now()) @map("created_at")

  @@index([userId, createdAt])
  @@map("import_logs")
}
```

`AdvisorReport` (owned by [advisor](../advisor/spec.md)) gains three nullable fields so a report can be named rather than identified by its file name:

```prisma
  title       String?   // "Carteira Recomendada — Setembro 2026"
  publisher   String?   // the research house
  publishedAt DateTime? @map("published_at") @db.Date
```

They are nullable so existing rows stay valid, and `sourceName` keeps its current meaning. Both changes follow the repo's Prisma conventions (UUIDv7 `@db.Uuid` keys, `snake_case` `@@map`/`@map`) — see [`CONVENTIONS.md`](../../CONVENTIONS.md).

## API Contract

**Reused unchanged.** All require auth, take the multipart field `file`, and cap CSVs at `MAX_CSV_UPLOAD_BYTES` (1 MB) and PDFs at `MAX_PDF_UPLOAD_BYTES` (10 MB):

| Method | Path | Extra fields | Response | Note |
|---|---|---|---|---|
| POST | `/market-data/assets/import` | — | `{ created, updated, errors: string[] }` | Partial import: valid rows land, bad rows are reported |
| POST | `/portfolio/holdings/upload-csv` | — | `{ created, updated, errors: string[] }` | Partial import; **upserts by ticker, never deletes** |
| POST | `/advisor/recommended-portfolios/upload?wallet=` | `effectiveDate?`, `sourceName?` | created `RecommendedPortfolio` with holdings | **All-or-nothing**: one bad row rejects the whole file. Creates a new version |
| POST | `/advisor/reports/upload` | `title`, `publisher`, `publishedAt` (new), `sourceName?` | created `AdvisorReport` | Additive; every upload is a new report |

**New**, owned by this module (`AuthGuard`, scoped to `req.user.id`):

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/data-sources/summary` | — | everything the four source cards need, in one call (shape below) |
| GET | `/data-sources/imports?limit=20` | — | `ImportLog[]`, newest first |
| POST | `/data-sources/imports` | `{ source, walletType?, fileName, records, status, message?, errors?: string[] }` | created `ImportLog` |

```ts
// GET /data-sources/summary
{
  assets:   { count: number; tickers: string[]; lastImportAt: string | null },
  holdings: { count: number; lastImportAt: string | null },
  wallets:  { walletType: WalletType; effectiveDate: string; sourceName: string | null; positions: number }[],
  report:   { id: string; title: string | null; publisher: string | null;
              publishedAt: string | null; fileName: string | null; uploadedAt: string } | null,
}
```

`summary` composes the existing portfolio, recommended-portfolios and advisor services rather than re-querying their tables directly (see [market-data](../market-data/spec.md) → "Module boundary" for why modules don't reach into each other's rows). `assets.tickers` doubles as the `knownTickers` list the preview needs for its unknown-ticker warnings, so the page needs no second call.

## Behavior Notes

### The CSV formats are the ones the importers already accept

The design this page came from invented English column names (`asset_class`, `avg_price`, `weight_pct`, `Buy`/`Hold`/`Sell`). **The spec deliberately keeps the real formats**, so existing broker and research-house exports keep working and no parser is rewritten. Each is owned by another spec and quoted here, not redefined:

| Source | Required | Optional | Notes |
|---|---|---|---|
| **Assets** ([market-data](../market-data/spec.md)) | `ticker` | `sector`, `subSector`, `investmentStyle`, `riskRating`, `assetType` | Resolved by header name. An **absent** column leaves that field untouched; a **present-but-empty** cell clears it to `null`. Rows with an empty `ticker` are skipped silently. Enums: `AssetType` = `EQUITY\|FIXED_INCOME\|CRYPTO`; `InvestmentStyle` = `SMALL_CAP\|MICRO_CAP\|DIVIDENDS\|VALUE_INVESTING\|TURNAROUND\|ETF`; `RiskRating` = the S&P/Fitch scale `AAA`…`D` |
| **Holdings** ([portfolio](../portfolio/spec.md)) — **interim format**, see below | three columns **by position**: `ticker`, `quantity`, `avgPrice` | — | The header row is skipped without being read, so its wording is irrelevant, but **the order of the three columns is not**. A row with any other number of cells is an error. Plain decimal numbers (`1234.56`); `1.234,56` is rejected. An empty `ticker` is an error, not a skipped row. *Target format once portfolio's parser lands:* `Ticker`, `Quantidade`, `Preco Médio` by header name, Brazilian numbers, all other columns ignored, empty `Ticker` rows skipped |
| **Model wallets** ([recommended-portfolios](../recommended-portfolios/spec.md)) | `CODIGO`, `PRECO_TETO` | `EMPRESA`, `ALOCACAO_SUGERIDA`, `RECOMENDACAO`, `MARGEM_DE_SEGURANCA`, `DY_*` | `RECOMENDACAO` is `COMPRA\|NEUTRO\|VENDA` → `BUY\|NEUTRAL\|SELL`. The `DY_` column is matched by prefix (`DY_2025`, `DY_2026`) |

**The holdings format is interim, on purpose.** The shipped importer (`PortfolioService.importHoldingsCsv`) parses the old positional three-column form. [portfolio](../portfolio/spec.md) specifies a different one — header-name columns, Brazilian numbers, the real 23-column broker export — and PR #176 reopens portfolio US-2 to build it, but that work hasn't landed. Rather than block the holdings panel on it, this module **targets what the server accepts today**, so the preview and the import agree.

That constraint is the whole point of the design, and this format makes it harder to honour, not easier. Three rules follow:

- **The preview must reproduce the server's verdict, not a friendlier one.** A row the server rejects must show as an error in the preview, and one it accepts must not. In particular the validator reads cells **by position** and needs each row's **true cell count** — `parseCsv` alone can't supply that, since it drops cells beyond the header's width — so a row with the wrong number of cells is caught, exactly as the server does.
- **A parity test guards it.** The same set of CSV fixtures runs through the shared validator and through `importHoldingsCsv`, and the two must agree on which rows fail and why. Without it, this is where the preview and the server would quietly drift apart.
- **It is temporary.** When portfolio's parser lands, the holdings validator, its template and the panel's hint copy move to the target format in the same change that swaps the server's parser — ideally by making the server call the shared validator, which removes the parity problem outright. That migration is not a task here; it belongs to the portfolio work that changes the format.

A user whose broker export is the real 23-column file will therefore see it rejected in the preview until that lands — a truthful answer, since the server would reject it too.

### One parser, two callers

CSV parsing and row validation move into **`packages/shared/src/csv/`**, per the CLAUDE.md rule that pure, testable logic lives there rather than being duplicated:

- `parseCsv(text)` — quoted fields, escaped `""`, trimming, header-name resolution (case-insensitive).
- `validateAssetsRows`, `validateHoldingsRows`, `validateWalletRows` — each returns `{ columns, rows, rowIssues, fileIssues }`, where an issue is `{ row?, severity: 'error' | 'warning', message }`.

`apps/api` refactors `assets-csv.ts` / `asset-row.ts`, `wallet-csv.ts` and the holdings parser to consume these; the page imports the same functions. **This is the point of the whole design**: a preview that runs different code from the importer will eventually promise an import the server then refuses.

Row-level warnings (the row still imports):
- Holdings/wallets: a ticker absent from `assets.tickers` — "{T} is not in the asset master; it will show as Unclassified in allocation" / "…import it under Assets first". Importing assets refreshes `knownTickers`, so re-checking the file clears these.

File-level issues:
- **Missing required column** (error) — blocks the import, names the columns, points at the template.
- **Wallet weights not summing to 100% ± 0.5%** (warning) — names the actual total.

### Import effects, stated truthfully

The page's copy describes what actually happens, not the design's replace model:

| Source | Effect |
|---|---|
| Assets | Adds or updates assets by ticker. Tickers not in the file are untouched. An unknown ticker creates the `Asset` row |
| Holdings | **Upserts** by ticker: positions in the file are added or updated, positions absent from it are left alone. Importing does not remove anything |
| Model wallets | Creates a **new version** of that wallet. Earlier versions are kept; the advisor reads the latest per wallet type |
| Report | Adds a report. The advisor uses the most recent one |

### "Skip rows with errors" only where the server can honour it

Assets and holdings import valid rows and return the rest in `errors[]`, so the checkbox maps to real behaviour: it is shown when there are row errors, checked by default, and the button counts only the rows that will be written.

**The wallet endpoint rejects the entire file if any row is bad.** For wallets the checkbox is therefore **not rendered**, and the gate requires zero row errors. The page must never work around this by re-serializing a filtered CSV — that would silently change the user's file and reintroduce the injection risk the templates guard against.

### Import gate

The primary button is enabled only when: a file is attached; no required column is missing; there are no row errors **or** skip is available and checked; at least one row will be written; and the source's required detail fields are filled. When disabled, the footer shows the first unmet rule:

- "Add the missing columns and re-upload."
- "Fix errors or skip those rows to continue." (assets/holdings)
- "Fix the errors and re-upload — a wallet file is imported all at once." (wallets)
- "Add the research house and effective date." (wallets)
- "Add title, publisher and publication date." (report)

### Detail fields

| Source | Fields |
|---|---|
| Model wallets | Research house (`sourceName`, defaults to the last value used), Effective date (`effectiveDate`, defaults to today) |
| Report | Title, Publisher, Publication date |

### Flow

The page opens on Assets. Attaching a file parses and validates it immediately; for a PDF the page reads size and page count. On a successful upload the page clears the file, writes an `ImportLog` (carrying any `errors[]` the server returned), refreshes the summary, prepends a history row, and shows a success banner naming what changed (for example "Imported 42 holdings — 12 added, 30 updated"), with "{n} rows with errors skipped" appended when rows were skipped. On failure the file and its review stay put, an error banner explains why, and a `FAILED` log row is written with the same `errors[]`.

A history row whose `errors` is non-empty says so next to its record count ("28 · 12 rejected") and expands to list them, so a partial success isn't reported as a clean one and the detail outlives the banner. A wrong file type is rejected before attaching ("{file} is not a CSV file."). Repeat clicks while importing are ignored.

### Page structure and removals

- Route `apps/web/app/(dashboard)/data-sources/page.tsx`, inheriting the group's auth guard.
- The sidebar rail gains a "Data sources" item, and — since it has **no active-item styling today** — every item gains `aria-current="page"` plus a selected style.
- The dashboard's "Add holdings" link retargets to `/data-sources`.
- **Deleted** (with their tests): `components/holdings/HoldingsCsvUpload.tsx`, `components/holdings/AddHoldingForm.tsx`, `components/dashboard/advisor/AdvisorReportUpload.tsx`, `components/dashboard/advisor/RecommendedPortfoliosUpload.tsx`. `AdvisorPanel` keeps only the analysis and its Generate button; `/holdings` keeps only the grid.
- `apps/web/e2e/dashboard-visual.spec.ts` baselines change as a result and must be regenerated in the Playwright container (see `apps/web/e2e/README.md`).

### Data ownership

**`Asset` rows are global; holdings, wallets and reports are per user.** This is deliberate and inherited from [market-data](../market-data/spec.md) → "the accepted trade-off is that classification is **global**". It matters on this page because this is where a user performs that write: importing an assets CSV changes the classification every user sees, while importing holdings, a wallet or a report only affects their own account. The Assets panel says so in one line, so a shared-deployment user isn't surprised. No per-user override and no conflict rule is in scope here; market-data already records the escape hatch if one is ever needed.

### Presentation

Layout, source cards, drop zone, file chip, review blocks, footer and history table follow the design prototype at [`resources/UI/Data Sources.html`](../../resources/UI/Data%20Sources.html), using the existing tokens in `globals.css` — including `--amber`, already added for the password strength meter. Valid is `--emerald`, warning `--amber`, error `--red`, with tinted surfaces via `color-mix`. CSV column names and file names are monospace. Fraunces is currently loaded only in the `(auth)` layout; the page header needs it in `(dashboard)` too.

New primitives are needed — the repo has no table, banner, checkbox, drop zone or segmented control today. Anything reusable belongs in `components/ui/` alongside `Button`, `Card`, `Badge`, `TextField`.

### Templates and CSV safety

Each template is generated in the browser from the shared column definitions, so a template can't drift from the parser, and downloads as `{source}-template.csv` containing only the header row (per wallet type for wallets). Any value written into a generated CSV that begins with `=`, `+`, `-` or `@` is prefixed with `'`, so a spreadsheet can't execute it.

### Accessibility

The drop zone is a focusable control whose accessible name states the accepted format, and Enter or Space opens the browser. Parse results and import outcomes are announced through one polite live region ("10 rows, 2 errors, 1 warning"). Status pills always carry their text (Valid / Warning / Error) and column checks use ✓/✕ with text, so nothing depends on colour. Wallet status dots carry an `aria-label` ("Imported" / "Not imported"). The preview table uses real `<th>` headers, and every row issue shown on hover is also in the issues list. Under `prefers-reduced-motion: reduce` the spinner and entrance animations are static.

## Acceptance Criteria

- [ ] `/data-sources` is reachable from the sidebar; an unauthenticated visit redirects to `/login`; the rail marks the current page with `aria-current="page"`.
- [ ] With an empty account, all four cards read "Never imported" and the history table shows its empty state.
- [ ] Dropping a `.pdf` on the assets drop zone attaches nothing and shows "… is not a CSV file."; the same for a `.csv` on the report zone.
- [ ] An assets CSV of 10 rows where 2 carry an unrecognised `riskRating` shows Rows 10 / Valid 8 / Errors 2, lists both errors with their row numbers, and the button reads "Import 8 assets" with skip checked.
- [ ] Unchecking skip on that file disables the button and shows "Fix errors or skip those rows to continue."
- [ ] An assets CSV with no `ticker` header shows `ticker` as a missing required column, disables the button, and shows "Add the missing columns and re-upload."
- [ ] A wallet CSV containing one invalid row renders **no** skip checkbox, disables the button, and explains that a wallet file is imported all at once.
- [ ] A wallet CSV whose `ALOCACAO_SUGERIDA` sums to 92% imports successfully and shows a file-level warning naming 92%.
- [ ] A holdings CSV with tickers absent from `Asset` shows one warning row per such ticker and still imports.
- [ ] Holdings preview and server agree: for a fixture set covering a clean file, a 4-cell row, a 2-cell row, an empty ticker, a zero quantity, a negative price, a non-numeric quantity and a Brazilian-formatted number (`1.234,56`), the shared holdings validator and `PortfolioService.importHoldingsCsv` report the same failing rows with the same messages.
- [ ] The real 23-column broker export shows every data row as an error in the holdings preview ("expected 3 columns … got 23"), matching what the server does with it.
- [ ] After importing assets, re-checking that same holdings file shows no unknown-ticker warnings, without a page reload.
- [ ] Attaching a file to Assets, switching to Holdings and back leaves the assets file and its review intact.
- [ ] A successful assets import clears the file, updates the Assets card meta, prepends a history row, and both persist after a reload.
- [ ] A failed import keeps the file and its review on screen, shows an error banner, and writes a `FAILED` history row.
- [ ] Importing an assets CSV with 2 rows the server rejects writes one `IMPORTED` history row — not one row per error — whose `errors` holds both messages; the row reads "8 · 2 rejected" and expands to show them after a reload.
- [ ] Importing the same wallet twice leaves two versions, and the card shows the newer `effectiveDate` — nothing is deleted.
- [ ] Uploading a report with title, publisher and publication date shows them on the report card, and `GET /data-sources/summary` returns them.
- [ ] `POST /advisor/reports/upload` without the new fields still succeeds (they are optional server-side).
- [ ] "Download CSV template" produces a header-only CSV whose columns are exactly the parser's, and the dividends wallet template differs from the others.
- [ ] `packages/shared` has unit tests for `parseCsv` (quoted fields, escaped `""`, spare whitespace, case-insensitive headers) and for each validator, and the API's import endpoints use those functions rather than their own copies.
- [ ] `/holdings` renders no upload control and no add-holding form; `AdvisorPanel` renders no upload controls; `grep -r "HoldingsCsvUpload\|AddHoldingForm\|AdvisorReportUpload\|RecommendedPortfoliosUpload" apps/web` returns nothing.
- [ ] Keyboard only: the drop zone can be focused and opened with Enter, and after parsing, a polite live region announces the row/error/warning counts.
- [ ] Under emulated `prefers-reduced-motion: reduce` the import spinner has no rotation animation.
- [ ] A Playwright spec covers attach → review → import → history for the assets CSV, and the dashboard visual baselines are regenerated.

## Open Questions

None outstanding.
