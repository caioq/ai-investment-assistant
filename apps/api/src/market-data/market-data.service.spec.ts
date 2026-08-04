import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from './market-data.service';
import { PriceProvider, PricePoint, Quote } from './providers/price-provider.interface';

describe('MarketDataService', () => {
  let marketDataService: MarketDataService;
  let prisma: {
    asset: {
      findMany: jest.Mock;
      update: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    priceHistory: {
      upsert: jest.Mock;
      createMany: jest.Mock;
    };
    benchmarkSnapshot: { createMany: jest.Mock };
  };
  let priceProvider: { getQuote: jest.Mock; getHistory: jest.Mock };

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

    marketDataService = new MarketDataService(
      prisma as unknown as PrismaService,
      priceProvider as unknown as PriceProvider,
    );
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

    it('leaves existing Asset prices untouched and logs the failure when the provider is unreachable', async () => {
      const existingAsset = { id: 'asset-1', ticker: 'PETR4', currentPrice: 42 };
      prisma.asset.findMany.mockResolvedValue([existingAsset]);
      priceProvider.getQuote.mockRejectedValue(new Error('upstream unreachable'));
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await expect(marketDataService.refreshAllQuotes()).resolves.not.toThrow();

      expect(prisma.asset.update).not.toHaveBeenCalled();
      expect(prisma.priceHistory.upsert).not.toHaveBeenCalled();
      expect(existingAsset.currentPrice).toBe(42);
      expect(errorSpy).toHaveBeenCalled();

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
});
