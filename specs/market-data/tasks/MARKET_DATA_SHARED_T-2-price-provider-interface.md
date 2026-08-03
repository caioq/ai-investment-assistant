# MARKET_DATA_SHARED_T-2: PriceProvider interface + MarketDataModule

**Shared by:** US-1, US-2, US-4
**Status:** Not Started
**GitHub Issue:** #57 (caioq/ai-investment-assistant — created by /user-stories; this file is still the source of truth, the issue mirrors it for GitHub Projects)
**Depends on:** none

Create the `market-data` module skeleton at `apps/api/src/market-data/` per `CONVENTIONS.md` → "Module structure": `market-data.module.ts`, `market-data.service.ts`, and a `PriceProvider` interface at `apps/api/src/market-data/providers/price-provider.interface.ts` declaring exactly two methods, per the spec's Behavior Notes:

- `getQuote(tickers: string[]): Promise<Quote[]>` — takes an **array**, never a single ticker, so batching is enforced by the type rather than left to the caller's discipline (spec: "Batching is mandatory").
- `getHistory(ticker: string, range: string, interval: string): Promise<PricePoint[]>`

Register `B3YahooProvider` (implemented in `MARKET_DATA_US-1_T-1` / `MARKET_DATA_US-2_T-1`) against an injection token — `export const PRICE_PROVIDER = Symbol('PRICE_PROVIDER')` — and have `MarketDataService` inject the interface via that token, not the concrete class. This is what the spec's "`PriceProvider` is an interface … so `FixedIncomeProvider`/`CryptoProvider` can be added later without touching the cron/aggregation logic" requires, and TypeScript interfaces don't survive to runtime so a token is the only way to express it in Nest DI. Register `MarketDataModule` in `apps/api/src/app.module.ts`. Export `Quote` (`{ ticker, price, changePct }`) and `PricePoint` (`{ date, close }`) as named types from the interface file.

**Test:** `apps/api/src/market-data/market-data.module.spec.ts` — boots `Test.createTestingModule({ imports: [MarketDataModule] }).compile()` and asserts (1) `module.get(PRICE_PROVIDER)` resolves to an object exposing callable `getQuote` and `getHistory`, and (2) `module.get(MarketDataService)` resolves. Follows the colocated-unit-spec convention in `CONVENTIONS.md` → "Testing". Confirm red first (no `MarketDataModule` exists, so the import fails to resolve), then green after implementing.

**Done when:** the test above passes, and `MarketDataService`'s constructor takes the provider via `@Inject(PRICE_PROVIDER)` rather than naming `B3BrapiProvider` directly.
