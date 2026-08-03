# US-3: Benchmark series (Ibovespa, CDI)

**Status:** Ready
**Traces to:** spec Goal "Fetch benchmark series (Ibovespa, CDI) for performance comparison." / AC "`BenchmarkSnapshot` has daily rows for both `IBOVESPA` and `CDI` covering at least the last year after the benchmark job runs once, with `CDI` stored as a compounded index level rather than a raw daily rate." (in `../spec.md`)

As a user reviewing my returns, I want Ibovespa and CDI history stored alongside my portfolio's, so "am I beating the index?" is answerable instead of a number floating without context.

## Tasks

- [x] [T-1: Ibovespa history into BenchmarkSnapshot](../tasks/MARKET_DATA_US-3_T-1-ibovespa-history.md)
- [x] [T-2: CDI history into BenchmarkSnapshot](../tasks/MARKET_DATA_US-3_T-2-cdi-history.md)
- [ ] [T-3: benchmark job wiring](../tasks/MARKET_DATA_US-3_T-3-benchmark-job.md)

## Notes

The two benchmarks come from **different upstreams** — the spec says Ibovespa via Yahoo Finance's chart endpoint (ticker `^BVSP`) and CDI via "e.g. Banco Central SGS API." That's why T-1 and T-2 are separate tasks rather than one "fetch benchmarks" task: they have different clients, different response shapes, and different failure modes, and neither should be blocked by the other's upstream being flaky.

CDI is published by BCB SGS as a **daily interest rate in percent**, not a price level, so T-2 compounds it into an index series before storing — otherwise `BenchmarkSnapshot.value` would mean something different for `CDI` than for `IBOVESPA` and any consumer comparing them would be wrong. The spec now states this explicitly (Data Model note on `BenchmarkSnapshot.value`, plus the "CDI is compounded into an index before storage" Behavior Note), and spec AC-5 checks it.

The spec calls this "a separate job" from the daily price cron, which T-3 honors — a benchmark upstream being down must not stop portfolio prices from refreshing, or vice versa.
