/**
 * A single current-price quote for a ticker, as returned by
 * `PriceProvider.getQuote`. See spec.md -> Data Model (`Asset.currentPrice`
 * / `Asset.currentChangePct`) for how this maps into persisted state.
 */
export interface Quote {
  ticker: string;
  price: number;
  changePct: number;
}

/**
 * A single day's closing price, as returned by `PriceProvider.getHistory`.
 * Maps 1:1 onto `PriceHistory` rows (see spec.md -> Data Model).
 */
export interface PricePoint {
  date: Date;
  close: number;
}

/**
 * Abstraction over a market-data upstream (Yahoo Finance today; a future
 * `FixedIncomeProvider`/`CryptoProvider` later — see spec.md's Behavior
 * Notes). Kept as an interface, not a class, so callers depend on this
 * contract rather than a concrete implementation; TypeScript interfaces
 * don't survive to runtime, so Nest DI needs an explicit injection token
 * (`PRICE_PROVIDER`) to wire an implementation behind it.
 */
export interface PriceProvider {
  /**
   * Fetches current price + daily change for every ticker in one batched
   * call — always an array, never a single ticker, so batching is enforced
   * by the type (spec: "Batching is mandatory").
   */
  getQuote(tickers: string[]): Promise<Quote[]>;

  /** Fetches a daily price series for a single ticker over `range`. */
  getHistory(ticker: string, range: string, interval: string): Promise<PricePoint[]>;
}

/** Nest DI token for the `PriceProvider` interface (see file docblock). */
export const PRICE_PROVIDER = Symbol('PRICE_PROVIDER');
