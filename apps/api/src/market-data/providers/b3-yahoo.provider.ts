import { Injectable } from '@nestjs/common';
import { PriceProvider, PricePoint, Quote } from './price-provider.interface';

/**
 * `PriceProvider` implementation backed by Yahoo Finance's unofficial
 * quote/chart endpoints (see spec.md -> Behavior Notes: "Why Yahoo
 * Finance, not a documented paid API"). `getQuote` (batched `/v7/finance/spark`)
 * and `getHistory` (`/v8/finance/chart`) are implemented in
 * `MARKET_DATA_US-1_T-1` / `MARKET_DATA_US-2_T-1` respectively — this class
 * only exists here as the concrete type registered behind the
 * `PRICE_PROVIDER` token (`MARKET_DATA_SHARED_T-2`).
 */
@Injectable()
export class B3YahooProvider implements PriceProvider {
  getQuote(tickers: string[]): Promise<Quote[]> {
    throw new Error(`Not implemented yet (MARKET_DATA_US-1_T-1): getQuote(${tickers.join(',')})`);
  }

  getHistory(ticker: string, range: string, interval: string): Promise<PricePoint[]> {
    throw new Error(
      `Not implemented yet (MARKET_DATA_US-2_T-1): getHistory(${ticker}, ${range}, ${interval})`,
    );
  }
}
