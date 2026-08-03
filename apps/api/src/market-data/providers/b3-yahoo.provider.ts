import { Injectable } from '@nestjs/common';
import { PriceProvider, PricePoint, Quote } from './price-provider.interface';

const SPARK_URL = 'https://query1.finance.yahoo.com/v7/finance/spark';

/**
 * Yahoo rejects requests with no `User-Agent` more readily than ones that
 * look like a real browser — see spec.md -> Behavior Notes: "Why Yahoo
 * Finance, not a documented paid API".
 */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** Shape of the `/v7/finance/spark` response this provider cares about. */
interface SparkResponse {
  spark: {
    result: {
      symbol: string;
      response: {
        meta: {
          regularMarketPrice: number;
          chartPreviousClose: number;
        };
      }[];
    }[];
  };
}

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
  /**
   * Fetches current price + daily change for every ticker in **one**
   * batched request — never one request per ticker (spec: "Batching is
   * mandatory"). Each ticker is suffixed `.SA` for B3 in the request and
   * stripped back off in the response.
   */
  async getQuote(tickers: string[]): Promise<Quote[]> {
    const symbols = tickers.map((ticker) => `${ticker}.SA`).join(',');
    const url = new URL(SPARK_URL);
    url.searchParams.set('symbols', symbols);
    url.searchParams.set('range', '1d');
    url.searchParams.set('interval', '1d');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
    });
    const payload = (await res.json()) as SparkResponse;

    return payload.spark.result.map((result) => {
      const { regularMarketPrice, chartPreviousClose } = result.response[0].meta;
      return {
        ticker: result.symbol.replace(/\.SA$/, ''),
        price: regularMarketPrice,
        changePct: ((regularMarketPrice - chartPreviousClose) / chartPreviousClose) * 100,
      };
    });
  }

  getHistory(ticker: string, range: string, interval: string): Promise<PricePoint[]> {
    throw new Error(
      `Not implemented yet (MARKET_DATA_US-2_T-1): getHistory(${ticker}, ${range}, ${interval})`,
    );
  }
}
