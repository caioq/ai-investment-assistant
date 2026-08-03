import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from './market-data.service';
import { PriceProvider, Quote } from './providers/price-provider.interface';

describe('MarketDataService', () => {
  let marketDataService: MarketDataService;
  let prisma: {
    asset: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
    priceHistory: {
      upsert: jest.Mock;
    };
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

  beforeEach(() => {
    prisma = {
      asset: {
        findMany: jest.fn().mockResolvedValue(assets),
        update: jest.fn(),
      },
      priceHistory: {
        upsert: jest.fn(),
      },
    };
    priceProvider = {
      getQuote: jest.fn().mockResolvedValue(quotes),
      getHistory: jest.fn(),
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
  });
});
