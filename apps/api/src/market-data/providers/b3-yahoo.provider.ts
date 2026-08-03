import { Injectable } from '@nestjs/common';
import { PriceProvider, PricePoint, Quote } from './price-provider.interface';

const SPARK_URL = 'https://query1.finance.yahoo.com/v7/finance/spark';
const CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

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

/** Shape of the `/v8/finance/chart` response this provider cares about. */
interface ChartResponse {
  chart: {
    result: {
      timestamp: number[];
      indicators: {
        quote: { close: (number | null)[] }[];
      };
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

    // `fetch` resolves on 4xx/5xx, so without this a rate-limited 429 flows
    // straight into `res.json()`. It happens to throw today only because
    // Yahoo's block page is HTML — a 429 carrying a JSON error body parses
    // fine and then fails on `payload.spark` being undefined, several lines
    // from the real cause. `MarketDataService.refreshAllQuotes` catches and
    // logs this (MARKET_DATA_US-1_T-3), so the message needs to be useful.
    if (!res.ok) {
      throw new Error(`Yahoo Finance spark request failed: ${res.status} ${res.statusText}`);
    }

    const payload: SparkResponse = await res.json();

    const quotes: Quote[] = [];
    for (const result of payload.spark.result) {
      // A ticker Yahoo doesn't recognise comes back with an empty `response`
      // array. Destructuring it blindly throws mid-loop and would lose every
      // *other* ticker in the batch, so skip it instead. Same for a zero
      // previous close, which yields `Infinity` without throwing at all — a
      // poisoned number propagates silently into portfolio math, which is
      // worse than a missing one.
      const meta = result.response[0]?.meta;
      if (!meta || meta.chartPreviousClose === 0) continue;

      const { regularMarketPrice, chartPreviousClose } = meta;
      quotes.push({
        ticker: result.symbol.replace(/\.SA$/, ''),
        price: regularMarketPrice,
        changePct: ((regularMarketPrice - chartPreviousClose) / chartPreviousClose) * 100,
      });
    }

    return quotes;
  }

  /**
   * Fetches a daily price series for a single ticker over `range`. Index
   * tickers (e.g. `^BVSP`, used by `MARKET_DATA_US-3_T-1`) aren't B3-listed
   * equities and don't take the `.SA` suffix.
   */
  async getHistory(ticker: string, range: string, interval: string): Promise<PricePoint[]> {
    const symbol = ticker.startsWith('^') ? ticker : `${ticker}.SA`;
    const url = new URL(`${CHART_URL}/${symbol}`);
    url.searchParams.set('range', range);
    url.searchParams.set('interval', interval);

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
    });
    const payload = (await res.json()) as ChartResponse;

    const result = payload.chart.result[0];
    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;

    const points: PricePoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      // Yahoo returns `null` for the most-recent trading day when it's
      // still in progress; skip it rather than violate PriceHistory.close's
      // non-null constraint (see spec.md -> Behavior Notes).
      if (close === null) continue;
      points.push({ date: new Date(timestamps[i] * 1000), close });
    }

    return points;
  }
}
