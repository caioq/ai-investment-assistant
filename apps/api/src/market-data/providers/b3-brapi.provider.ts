import { Injectable } from '@nestjs/common';
import { PriceProvider, PricePoint, Quote } from './price-provider.interface';

interface BrapiQuoteResult {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
}

interface BrapiQuoteResponse {
  results: BrapiQuoteResult[];
}

/**
 * B3 equities implementation of `PriceProvider`, backed by brapi.dev.
 *
 * The `getHistory` backfill call is implemented in `MARKET_DATA_US-2_T-1` —
 * out of scope here.
 */
@Injectable()
export class B3BrapiProvider implements PriceProvider {
  /**
   * Issues exactly one batched request for the whole ticker list — spec's
   * "Batching is mandatory" rule (MARKET_DATA_US-1_T-1). Never call this in
   * a loop, one ticker at a time.
   */
  async getQuote(tickers: string[]): Promise<Quote[]> {
    const url = `https://brapi.dev/api/quote/${tickers.join(',')}?token=${process.env.BRAPI_TOKEN}`;
    const response = await fetch(url);
    const payload = (await response.json()) as BrapiQuoteResponse;

    return payload.results.map((result) => ({
      ticker: result.symbol,
      price: result.regularMarketPrice,
      changePct: result.regularMarketChangePercent,
    }));
  }

  async getHistory(_ticker: string, _range: string, _interval: string): Promise<PricePoint[]> {
    throw new Error('Not implemented');
  }
}
