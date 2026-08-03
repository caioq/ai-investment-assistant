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
  });
});
