import { Injectable } from '@nestjs/common';
import { PriceProvider, PricePoint, Quote } from './price-provider.interface';

/**
 * B3 equities implementation of `PriceProvider`, backed by brapi.dev.
 *
 * This is a structural stub only — it exists so `MarketDataModule` can
 * register a concrete `PriceProvider` against the `PRICE_PROVIDER` token.
 * The real batched `getQuote` call (`GET /api/quote/{T1},{T2},...`) and the
 * `getHistory` backfill call are implemented in `MARKET_DATA_US-1_T-1` and
 * `MARKET_DATA_US-2_T-1` respectively — out of scope here.
 */
@Injectable()
export class B3BrapiProvider implements PriceProvider {
  async getQuote(_tickers: string[]): Promise<Quote[]> {
    throw new Error('Not implemented');
  }

  async getHistory(_ticker: string, _range: string, _interval: string): Promise<PricePoint[]> {
    throw new Error('Not implemented');
  }
}
