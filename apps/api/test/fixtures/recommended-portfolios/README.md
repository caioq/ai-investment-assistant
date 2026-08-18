# Recommended-portfolios CSV fixtures

`overall-recommended.csv`, `dividends.csv` and `small-caps.csv` are the fixtures every parser unit test and upload e2e test in the [recommended-portfolios](../../../../../specs/recommended-portfolios/spec.md) module reads. Added by `RECOMMENDED_PORTFOLIOS_SHARED_T-3`.

## They are synthetic on purpose

They are **not** copies of the real exports. The real files are a research house's paid output — real tickers with their ceiling prices, buy/sell calls and allocation weights — and this repository is public, so committing them would republish subscription content. No acceptance criterion depends on the *values* being real; every one depends on the files' **shape**. So the shape is reproduced exactly and the data is invented.

Tickers (`RPFA3`, `RPDB4`, `RPSC3`, …) are namespaced to this suite rather than real B3 codes, per `CONVENTIONS.md` → "Testing": e2e suites run in parallel against one test Postgres, and reusing another suite's ticker (`PETR4`, `VALE3`) makes the two suites delete each other's rows.

## The shape is the contract — do not "correct" it

Each oddity below is what some task's test exists to survive. Normalising it makes that test vacuous rather than making the fixtures tidier:

- **The differing column order.** `EMPRESA` is 1st in Overall and Small Caps but 2nd in Dividends. The parser is header-name-driven, never positional (`US-1_T-2`).
- **`DY_2026` in Overall and Dividends, `DY_2025` in Small Caps.** The year suffix is why the dividend-yield column is matched by prefix (`US-1_T-2`).
- **Overall's final tickerless row** (`Renda Fixa - LFT Tesouro`): a `label` and a 15% `ALOCACAO_SUGERIDA`, every other field empty. Its equity rows sum to 85 and the file to 100, matching the real export. It lands with `assetId: null` (`US-1_T-3`).
- **Dividends' `PRECO_TETO_2` disagreeing with `PRECO_TETO`** on some rows. `PRECO_TETO` is authoritative; the second column is ignored and never stored (`US-1_T-3`).
- **Populated `RISCO`, `SETOR` and `CATEGORIA`.** The spec's Non-Goals say these are not persisted; leaving them empty here would make that assertion pass trivially.
- **Quoted Brazilian formatting** — `"R$ 47,50"`, `"8,00%"`, a negative `"-6,71%"`, and at least one value with a `.` thousands separator (`"R$ 1.234,56"`). The real files happen to have no thousands separator today, and a parser that only strips `,` passes on them and breaks on the first expensive ticker (`US-1_T-1`).
- **`RECOMENDACAO` covers `COMPRA`, `NEUTRO` and `VENDA`** across the set, with the sole `VENDA` in Small Caps, as in the real exports.

`fixtures.e2e-spec.ts` in this directory guards all of the above, so drift fails loudly here rather than silently weakening another suite. It reads files only — no database or Nest app. It carries the `.e2e-spec.ts` suffix because `test/jest-e2e.json` is the only Jest config in `apps/api` that collects files under `test/` (the unit config in `package.json` has `rootDir: "src"`); a `*.spec.ts` here would be collected by no runner at all.
