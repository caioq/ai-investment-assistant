/**
 * `PriceProvider` is an interface (not a concrete class) so the cron/aggregation
 * logic in `MarketDataService` can depend on it instead of a specific vendor —
 * `FixedIncomeProvider`/`CryptoProvider` can be added later without touching
 * that logic. See spec.md -> Behavior Notes.
 *
 * TypeScript interfaces don't survive to runtime, so Nest DI needs a token to
 * inject "the current PriceProvider implementation" — see `PRICE_PROVIDER` below.
 */
export interface Quote {
  ticker: string;
  price: number;
  changePct: number;
}

export interface PricePoint {
  date: Date;
  close: number;
}

export interface PriceProvider {
  /**
   * Always takes an array, never a single ticker, so batching is enforced by
   * the type rather than left to the caller's discipline (spec: "Batching is
   * mandatory").
   */
  getQuote(tickers: string[]): Promise<Quote[]>;
  getHistory(ticker: string, range: string, interval: string): Promise<PricePoint[]>;
}

export const PRICE_PROVIDER = Symbol('PRICE_PROVIDER');
