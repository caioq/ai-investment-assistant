import { B3YahooProvider } from './b3-yahoo.provider';

const TICKERS = ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'WEGE3'];

/** Canned `/v7/finance/spark` payload for the 5 tickers above. */
const SPARK_PAYLOAD = {
  spark: {
    result: [
      {
        symbol: 'PETR4.SA',
        response: [{ meta: { regularMarketPrice: 38.5, chartPreviousClose: 38.0 } }],
      },
      {
        symbol: 'VALE3.SA',
        response: [{ meta: { regularMarketPrice: 61.2, chartPreviousClose: 62.0 } }],
      },
      {
        symbol: 'ITUB4.SA',
        response: [{ meta: { regularMarketPrice: 32.1, chartPreviousClose: 32.1 } }],
      },
      {
        symbol: 'BBAS3.SA',
        response: [{ meta: { regularMarketPrice: 27.8, chartPreviousClose: 27.5 } }],
      },
      {
        symbol: 'WEGE3.SA',
        response: [{ meta: { regularMarketPrice: 40.0, chartPreviousClose: 39.0 } }],
      },
    ],
  },
};

describe('B3YahooProvider', () => {
  let provider: B3YahooProvider;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    provider = new B3YahooProvider();
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => SPARK_PAYLOAD,
    } as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('getQuote', () => {
    it('issues exactly one fetch call for 5 distinct tickers', async () => {
      await provider.getQuote(TICKERS);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('requests all tickers, each suffixed .SA, comma-joined in the symbols query param', async () => {
      await provider.getQuote(TICKERS);

      const requestedUrl = new URL(fetchSpy.mock.calls[0][0] as string);
      expect(requestedUrl.searchParams.get('symbols')).toBe(
        'PETR4.SA,VALE3.SA,ITUB4.SA,BBAS3.SA,WEGE3.SA',
      );
    });

    it('sets a browser-like User-Agent header on the request', async () => {
      await provider.getQuote(TICKERS);

      const requestInit = fetchSpy.mock.calls[0][1] as RequestInit;
      const headers = new Headers(requestInit.headers);
      expect(headers.get('User-Agent')).toBeTruthy();
    });

    it('maps each spark result to a Quote with .SA stripped and changePct computed', async () => {
      const quotes = await provider.getQuote(TICKERS);

      expect(quotes).toEqual([
        { ticker: 'PETR4', price: 38.5, changePct: ((38.5 - 38.0) / 38.0) * 100 },
        { ticker: 'VALE3', price: 61.2, changePct: ((61.2 - 62.0) / 62.0) * 100 },
        { ticker: 'ITUB4', price: 32.1, changePct: 0 },
        { ticker: 'BBAS3', price: 27.8, changePct: ((27.8 - 27.5) / 27.5) * 100 },
        { ticker: 'WEGE3', price: 40.0, changePct: ((40.0 - 39.0) / 39.0) * 100 },
      ]);
    });

    /**
     * `MARKET_DATA_US-1_T-3`: the provider is the half that must fail loudly
     * and precisely, so `MarketDataService.refreshAllQuotes` has a rejection
     * to catch. `fetch` does not reject on 4xx/5xx, and one unrecognised
     * ticker must not void the whole batch.
     */
    describe('upstream failure modes', () => {
      it('rejects with the status when Yahoo returns a non-2xx carrying a JSON body', async () => {
        // A rate-limited 429 whose body is *valid JSON* — without an `res.ok`
        // check this parses fine and only dies later on `payload.spark` being
        // undefined, so asserting on the message is the point of this case.
        fetchSpy.mockResolvedValue({
          ok: false,
          status: 429,
          json: async () => ({ finance: { error: { code: 'Too Many Requests' } } }),
        } as Response);

        await expect(provider.getQuote(TICKERS)).rejects.toThrow('429');
      });

      it('skips results with an empty response array rather than voiding the batch', async () => {
        fetchSpy.mockResolvedValue({
          ok: true,
          json: async () => ({
            spark: {
              result: [
                { symbol: 'NOPE3.SA', response: [] },
                {
                  symbol: 'PETR4.SA',
                  response: [{ meta: { regularMarketPrice: 38.5, chartPreviousClose: 38.0 } }],
                },
              ],
            },
          }),
        } as Response);

        const quotes = await provider.getQuote(['NOPE3', 'PETR4']);

        expect(quotes).toEqual([
          { ticker: 'PETR4', price: 38.5, changePct: ((38.5 - 38.0) / 38.0) * 100 },
        ]);
      });

      it('skips results with a zero chartPreviousClose rather than emitting Infinity', async () => {
        fetchSpy.mockResolvedValue({
          ok: true,
          json: async () => ({
            spark: {
              result: [
                {
                  symbol: 'ZERO3.SA',
                  response: [{ meta: { regularMarketPrice: 10.0, chartPreviousClose: 0 } }],
                },
              ],
            },
          }),
        } as Response);

        const quotes = await provider.getQuote(['ZERO3']);

        expect(quotes).toEqual([]);
      });
    });
  });
});
