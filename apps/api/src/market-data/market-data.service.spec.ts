import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService, MARKET_DATA_REFRESH_COMPLETED_EVENT } from './market-data.service';
import { PriceProvider, PricePoint, Quote } from './providers/price-provider.interface';

describe('MarketDataService', () => {
  let marketDataService: MarketDataService;
  let prisma: {
    asset: {
      findMany: jest.Mock;
      update: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    priceHistory: {
      upsert: jest.Mock;
      createMany: jest.Mock;
    };
    benchmarkSnapshot: { createMany: jest.Mock };
  };
  let priceProvider: { getQuote: jest.Mock; getHistory: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  const assets = [
    { id: 'asset-1', ticker: 'PETR4' },
    { id: 'asset-2', ticker: 'VALE3' },
    { id: 'asset-3', ticker: 'ITUB4' },
  ];

  const quotes: Quote[] = [
    { ticker: 'PETR4', price: 38.5, changePct: 1.2 },
    { ticker: 'VALE3', price: 62.1, changePct: -0.5 },
    { ticker: 'ITUB4', price: 33.9, changePct: 0.3 },
  ];

  const assetId = 'asset-1';
  const ticker = 'PETR4';

  // A 250-point 1y daily series, matching what B3YahooProvider.getHistory
  // returns for range='1y'/interval='1d' (spec.md AC-3).
  const oneYearSeries: PricePoint[] = Array.from({ length: 250 }, (_, i) => ({
    date: new Date(Date.UTC(2025, 0, 1 + i)),
    close: 30 + i * 0.1,
  }));

  // A 250-point 1y daily series, matching what B3YahooProvider.getHistory
  // returns for range='1y'/interval='1d' (spec.md AC-3) for the ^BVSP ticker.
  const ibovespaSeries: PricePoint[] = Array.from({ length: 250 }, (_, i) => ({
    date: new Date(Date.UTC(2025, 0, 1 + i)),
    close: 120000 + i * 10,
  }));

  beforeEach(() => {
    prisma = {
      asset: {
        findMany: jest.fn().mockResolvedValue(assets),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: assetId, ticker }),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation((args: { data: { ticker: string } }) =>
            Promise.resolve({ id: `${args.data.ticker}-asset-id`, ticker: args.data.ticker }),
          ),
      },
      priceHistory: {
        upsert: jest.fn(),
        createMany: jest.fn().mockResolvedValue({ count: oneYearSeries.length }),
      },
      benchmarkSnapshot: {
        createMany: jest.fn().mockResolvedValue({ count: ibovespaSeries.length }),
      },
    };
    priceProvider = {
      getQuote: jest.fn().mockResolvedValue(quotes),
      getHistory: jest.fn().mockResolvedValue(oneYearSeries),
    };
    eventEmitter = { emit: jest.fn() };

    marketDataService = new MarketDataService(
      prisma as unknown as PrismaService,
      priceProvider as unknown as PriceProvider,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('refreshAllQuotes', () => {
    it('calls getQuote once with every Asset ticker', async () => {
      await marketDataService.refreshAllQuotes();

      expect(prisma.asset.findMany).toHaveBeenCalledTimes(1);
      expect(priceProvider.getQuote).toHaveBeenCalledTimes(1);
      expect(priceProvider.getQuote).toHaveBeenCalledWith(['PETR4', 'VALE3', 'ITUB4']);
    });

    it('writes currentPrice/currentChangePct/priceUpdatedAt for each asset from the matching quote', async () => {
      await marketDataService.refreshAllQuotes();

      expect(prisma.asset.update).toHaveBeenCalledTimes(3);
      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: 'asset-1' },
        data: {
          currentPrice: 38.5,
          currentChangePct: 1.2,
          priceUpdatedAt: expect.any(Date),
        },
      });
      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: 'asset-2' },
        data: {
          currentPrice: 62.1,
          currentChangePct: -0.5,
          priceUpdatedAt: expect.any(Date),
        },
      });
      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: 'asset-3' },
        data: {
          currentPrice: 33.9,
          currentChangePct: 0.3,
          priceUpdatedAt: expect.any(Date),
        },
      });
    });

    it('upserts one PriceHistory row per asset for today with close equal to the quoted price', async () => {
      await marketDataService.refreshAllQuotes();

      expect(prisma.priceHistory.upsert).toHaveBeenCalledTimes(3);

      const today = new Date();
      const expectedDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
      );

      expect(prisma.priceHistory.upsert).toHaveBeenCalledWith({
        where: { assetId_date: { assetId: 'asset-1', date: expectedDate } },
        update: { close: 38.5 },
        create: { assetId: 'asset-1', date: expectedDate, close: 38.5 },
      });
      expect(prisma.priceHistory.upsert).toHaveBeenCalledWith({
        where: { assetId_date: { assetId: 'asset-2', date: expectedDate } },
        update: { close: 62.1 },
        create: { assetId: 'asset-2', date: expectedDate, close: 62.1 },
      });
      expect(prisma.priceHistory.upsert).toHaveBeenCalledWith({
        where: { assetId_date: { assetId: 'asset-3', date: expectedDate } },
        update: { close: 33.9 },
        create: { assetId: 'asset-3', date: expectedDate, close: 33.9 },
      });
    });

    it('returns a summary with the number of assets refreshed', async () => {
      const result = await marketDataService.refreshAllQuotes();

      expect(result).toEqual({ refreshed: 3 });
    });

    it('emits market-data.refresh.completed with the refreshed count on success', async () => {
      await marketDataService.refreshAllQuotes();

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(MARKET_DATA_REFRESH_COMPLETED_EVENT, {
        refreshed: 3,
      });
    });

    it('leaves existing Asset prices untouched, logs the failure, and does not emit when the provider is unreachable', async () => {
      const existingAsset = { id: 'asset-1', ticker: 'PETR4', currentPrice: 42 };
      prisma.asset.findMany.mockResolvedValue([existingAsset]);
      priceProvider.getQuote.mockRejectedValue(new Error('upstream unreachable'));
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await expect(marketDataService.refreshAllQuotes()).resolves.not.toThrow();

      expect(prisma.asset.update).not.toHaveBeenCalled();
      expect(prisma.priceHistory.upsert).not.toHaveBeenCalled();
      expect(existingAsset.currentPrice).toBe(42);
      expect(errorSpy).toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });

  describe('backfillHistory', () => {
    it("calls getHistory with the asset's ticker, '1y', and '1d'", async () => {
      await marketDataService.backfillHistory(assetId);

      expect(prisma.asset.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: assetId } });
      expect(priceProvider.getHistory).toHaveBeenCalledWith(ticker, '1y', '1d');
    });

    it('writes one PriceHistory row per point in the returned series (not just today)', async () => {
      await marketDataService.backfillHistory(assetId);

      expect(prisma.priceHistory.createMany).toHaveBeenCalledTimes(1);
      const createManyArgs = prisma.priceHistory.createMany.mock.calls[0][0];

      expect(createManyArgs.data).toHaveLength(oneYearSeries.length);
      expect(createManyArgs.data[0]).toEqual({
        assetId,
        date: oneYearSeries[0].date,
        close: oneYearSeries[0].close,
      });
    });

    it('writes with skipDuplicates so a second backfill for the same asset resolves without throwing', async () => {
      await marketDataService.backfillHistory(assetId);
      const firstCallArgs = prisma.priceHistory.createMany.mock.calls[0][0];
      expect(firstCallArgs.skipDuplicates).toBe(true);

      // Calling it again must not throw, simulating the idempotent
      // @@unique([assetId, date]) constraint being upheld by skipDuplicates.
      await expect(marketDataService.backfillHistory(assetId)).resolves.not.toThrow();
      expect(prisma.priceHistory.createMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('syncIbovespa', () => {
    beforeEach(() => {
      priceProvider.getHistory.mockResolvedValue(ibovespaSeries);
    });

    it("calls getHistory with '^BVSP', '1y', and '1d'", async () => {
      await marketDataService.syncIbovespa();

      expect(priceProvider.getHistory).toHaveBeenCalledWith('^BVSP', '1y', '1d');
    });

    it('writes one BenchmarkSnapshot row per point, all with benchmark IBOVESPA', async () => {
      await marketDataService.syncIbovespa();

      expect(prisma.benchmarkSnapshot.createMany).toHaveBeenCalledTimes(1);
      const createManyArgs = prisma.benchmarkSnapshot.createMany.mock.calls[0][0];

      expect(createManyArgs.data).toHaveLength(ibovespaSeries.length);
      expect(createManyArgs.data[0]).toEqual({
        benchmark: 'IBOVESPA',
        date: ibovespaSeries[0].date,
        value: ibovespaSeries[0].close,
      });
      expect(
        createManyArgs.data.every((row: { benchmark: string }) => row.benchmark === 'IBOVESPA'),
      ).toBe(true);
    });

    it('writes with skipDuplicates so a re-run resolves without throwing', async () => {
      await marketDataService.syncIbovespa();
      const firstCallArgs = prisma.benchmarkSnapshot.createMany.mock.calls[0][0];
      expect(firstCallArgs.skipDuplicates).toBe(true);

      await expect(marketDataService.syncIbovespa()).resolves.not.toThrow();
      expect(prisma.benchmarkSnapshot.createMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('syncCdi', () => {
    const cannedSgsPayload = [
      { data: '01/07/2026', valor: '0.040000' },
      { data: '02/07/2026', valor: '0.040000' },
      { data: '03/07/2026', valor: '0.040000' },
    ];

    it('writes one compounded-index BenchmarkSnapshot row per business day, idempotently', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => cannedSgsPayload,
      } as Response);

      await marketDataService.syncCdi();

      expect(prisma.benchmarkSnapshot.createMany).toHaveBeenCalledTimes(1);
      const { data, skipDuplicates } = prisma.benchmarkSnapshot.createMany.mock.calls[0][0];

      expect(skipDuplicates).toBe(true);
      expect(data).toHaveLength(3);

      for (const row of data) {
        expect(row.benchmark).toBe('CDI');
      }

      // 01/07/2026 (DD/MM/YYYY) must parse to 2026-07-01, not 2026-01-07.
      expect(data[0].date).toEqual(new Date(Date.UTC(2026, 6, 1)));
      expect(data[1].date).toEqual(new Date(Date.UTC(2026, 6, 2)));
      expect(data[2].date).toEqual(new Date(Date.UTC(2026, 6, 3)));

      // Compounded index, not the raw daily rate.
      expect(data[0].value).toBe(100);
      expect(data[1].value).toBeCloseTo(100.04, 6);
      expect(data[2].value).toBeCloseTo(100.04 * 1.0004, 6);
    });
  });

  describe('getOrRefreshPrice', () => {
    const now = new Date('2026-08-04T12:00:00Z');

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns the stored price and calls getQuote zero times when priceUpdatedAt is 5 minutes ago (cache hit)', async () => {
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      prisma.asset.findUniqueOrThrow.mockResolvedValue({
        id: assetId,
        ticker,
        currentPrice: 38.5,
        currentChangePct: 1.2,
        priceUpdatedAt: fiveMinutesAgo,
      });

      const result = await marketDataService.getOrRefreshPrice(assetId);

      expect(prisma.asset.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: assetId } });
      expect(priceProvider.getQuote).not.toHaveBeenCalled();
      expect(prisma.asset.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        ticker,
        price: 38.5,
        changePct: 1.2,
        updatedAt: fiveMinutesAgo,
      });
    });

    it("calls getQuote once with ['PETR4'] and writes the fresh price back when priceUpdatedAt is 20 minutes ago (cache miss)", async () => {
      const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);
      prisma.asset.findUniqueOrThrow.mockResolvedValue({
        id: assetId,
        ticker,
        currentPrice: 30,
        currentChangePct: 0,
        priceUpdatedAt: twentyMinutesAgo,
      });
      priceProvider.getQuote.mockResolvedValue([{ ticker, price: 39.9, changePct: 2.1 }]);

      const result = await marketDataService.getOrRefreshPrice(assetId);

      expect(priceProvider.getQuote).toHaveBeenCalledTimes(1);
      expect(priceProvider.getQuote).toHaveBeenCalledWith(['PETR4']);
      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: assetId },
        data: {
          currentPrice: 39.9,
          currentChangePct: 2.1,
          priceUpdatedAt: now,
        },
      });
      expect(result).toEqual({
        ticker,
        price: 39.9,
        changePct: 2.1,
        updatedAt: now,
      });
    });

    it('treats a null priceUpdatedAt (never priced) as a cache miss', async () => {
      prisma.asset.findUniqueOrThrow.mockResolvedValue({
        id: assetId,
        ticker,
        currentPrice: null,
        currentChangePct: null,
        priceUpdatedAt: null,
      });
      priceProvider.getQuote.mockResolvedValue([{ ticker, price: 39.9, changePct: 2.1 }]);

      const result = await marketDataService.getOrRefreshPrice(assetId);

      expect(priceProvider.getQuote).toHaveBeenCalledWith(['PETR4']);
      expect(result).toEqual({
        ticker,
        price: 39.9,
        changePct: 2.1,
        updatedAt: now,
      });
    });
  });

  /**
   * Moved from `PortfolioService.upsertHolding`'s private find-or-create
   * (RECOMMENDED_PORTFOLIOS_US-1_T-5) — market-data owns the `Asset` model.
   * `portfolio.service.spec.ts` keeps its own concurrent-creation and
   * lowercase-normalisation cases, asserting `PortfolioService` still
   * delegates here rather than duplicating the find-or-create logic itself.
   */
  describe('findOrCreateAsset', () => {
    it('returns an existing ticker with wasCreated: false and issues no create', async () => {
      const existingAsset = { id: 'petr4-asset-id', ticker: 'PETR4' };
      prisma.asset.findUnique.mockResolvedValue(existingAsset);

      const result = await marketDataService.findOrCreateAsset('PETR4');

      expect(result).toEqual({ asset: existingAsset, wasCreated: false });
      expect(prisma.asset.create).not.toHaveBeenCalled();
    });

    it('creates an unseen ticker and returns wasCreated: true', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      const result = await marketDataService.findOrCreateAsset('VALE3');

      expect(prisma.asset.create).toHaveBeenCalledWith({
        data: { ticker: 'VALE3', name: 'VALE3' },
      });
      expect(result).toEqual({ asset: { id: 'VALE3-asset-id', ticker: 'VALE3' }, wasCreated: true });
    });

    it('resolves a lowercase ticker to the same uppercase Asset', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await marketDataService.findOrCreateAsset('petr4');

      expect(prisma.asset.findUnique).toHaveBeenCalledWith({ where: { ticker: 'PETR4' } });
      expect(prisma.asset.create).toHaveBeenCalledWith({
        data: { ticker: 'PETR4', name: 'PETR4' },
      });
    });

    /**
     * Find-or-create is two statements, so two requests for the same
     * brand-new ticker can both see `null` from `findUnique` and both
     * attempt `create`. Postgres lets exactly one win; the other comes back
     * with Prisma's P2002 unique-constraint error, which must resolve with
     * the winner's row rather than surfacing a 500 — and `wasCreated: false`
     * so the loser doesn't re-trigger a backfill.
     */
    it('recovers when it loses the race: re-reads the winner’s Asset instead of surfacing an error', async () => {
      const winnersAsset = { id: 'vale3-asset-id', ticker: 'VALE3' };
      prisma.asset.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(winnersAsset);
      prisma.asset.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`ticker`)', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['ticker'] },
        }),
      );

      const result = await marketDataService.findOrCreateAsset('VALE3');

      expect(result).toEqual({ asset: winnersAsset, wasCreated: false });
    });

    it('rethrows a non-P2002 Prisma failure rather than masking it as a lost race', async () => {
      prisma.asset.findUnique.mockResolvedValueOnce(null);
      prisma.asset.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Connection pool timeout', {
          code: 'P2024',
          clientVersion: 'test',
        }),
      );

      await expect(marketDataService.findOrCreateAsset('VALE3')).rejects.toMatchObject({
        code: 'P2024',
      });
    });
  });
});
