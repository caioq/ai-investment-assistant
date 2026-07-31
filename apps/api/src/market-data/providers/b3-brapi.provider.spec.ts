import { B3BrapiProvider } from './b3-brapi.provider';

describe('B3BrapiProvider.getQuote', () => {
  const tickers = ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'WEGE3'];

  const brapiPayload = {
    results: [
      { symbol: 'PETR4', regularMarketPrice: 38.5, regularMarketChangePercent: 1.2 },
      { symbol: 'VALE3', regularMarketPrice: 65.1, regularMarketChangePercent: -0.5 },
      { symbol: 'ITUB4', regularMarketPrice: 32.4, regularMarketChangePercent: 0.8 },
      { symbol: 'BBAS3', regularMarketPrice: 27.9, regularMarketChangePercent: -1.1 },
      { symbol: 'WEGE3', regularMarketPrice: 40.2, regularMarketChangePercent: 2.3 },
    ],
  };

  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.BRAPI_TOKEN = 'test-token';
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(brapiPayload),
    } as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('issues exactly one batched request for all tickers', async () => {
    const provider = new B3BrapiProvider();

    await provider.getQuote(tickers);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('comma-joins all tickers in one path segment and includes the token query param', async () => {
    const provider = new B3BrapiProvider();

    await provider.getQuote(tickers);

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('PETR4,VALE3,ITUB4,BBAS3,WEGE3');
    expect(url).toContain('token=test-token');
  });

  it('maps each brapi result to { ticker, price, changePct }', async () => {
    const provider = new B3BrapiProvider();

    const quotes = await provider.getQuote(tickers);

    expect(quotes).toEqual([
      { ticker: 'PETR4', price: 38.5, changePct: 1.2 },
      { ticker: 'VALE3', price: 65.1, changePct: -0.5 },
      { ticker: 'ITUB4', price: 32.4, changePct: 0.8 },
      { ticker: 'BBAS3', price: 27.9, changePct: -1.1 },
      { ticker: 'WEGE3', price: 40.2, changePct: 2.3 },
    ]);
  });
});
