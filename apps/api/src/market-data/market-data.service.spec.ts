import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from './market-data.service';
import { PriceProvider, Quote } from './providers/price-provider.interface';

describe('MarketDataService', () => {
  let service: MarketDataService;
  let prisma: { asset: { findMany: jest.Mock; update: jest.Mock }; priceHistory: { upsert: jest.Mock } };
  let priceProvider: { getQuote: jest.Mock; getHistory: jest.Mock };

  beforeEach(() => {
    prisma = {
      asset: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      priceHistory: {
        upsert: jest.fn(),
      },
    };
    priceProvider = {
      getQuote: jest.fn(),
      getHistory: jest.fn(),
    };

    service = new MarketDataService(
      prisma as unknown as PrismaService,
      priceProvider as unknown as PriceProvider,
    );
  });

  describe('refreshAllQuotes', () => {
    const assets = [
      { id: 'asset-1', ticker: 'PETR4' },
      { id: 'asset-2', ticker: 'VALE3' },
      { id: 'asset-3', ticker: 'ITUB4' },
    ];
    const quotes: Quote[] = [
      { ticker: 'PETR4', price: 38.5, changePct: 1.2 },
      { ticker: 'VALE3', price: 61.2, changePct: -0.5 },
      { ticker: 'ITUB4', price: 32.1, changePct: 0.8 },
    ];

    beforeEach(() => {
      prisma.asset.findMany.mockResolvedValue(assets);
      priceProvider.getQuote.mockResolvedValue(quotes);
    });

    it('calls getQuote once with every Asset ticker', async () => {
      await service.refreshAllQuotes();

      expect(priceProvider.getQuote).toHaveBeenCalledTimes(1);
      expect(priceProvider.getQuote).toHaveBeenCalledWith(['PETR4', 'VALE3', 'ITUB4']);
    });

    it("writes currentPrice/currentChangePct/priceUpdatedAt for each asset from the matching quote", async () => {
      await service.refreshAllQuotes();

      expect(prisma.asset.update).toHaveBeenCalledTimes(3);
      assets.forEach((asset, i) => {
        expect(prisma.asset.update).toHaveBeenCalledWith({
          where: { id: asset.id },
          data: {
            currentPrice: quotes[i].price,
            currentChangePct: quotes[i].changePct,
            priceUpdatedAt: expect.any(Date),
          },
        });
      });
    });

    it("upserts one PriceHistory row per asset for today's date with close equal to the quoted price", async () => {
      await service.refreshAllQuotes();

      const today = new Date();
      const expectedDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
      );

      expect(prisma.priceHistory.upsert).toHaveBeenCalledTimes(3);
      assets.forEach((asset, i) => {
        expect(prisma.priceHistory.upsert).toHaveBeenCalledWith({
          where: { assetId_date: { assetId: asset.id, date: expectedDate } },
          update: { close: quotes[i].price },
          create: { assetId: asset.id, date: expectedDate, close: quotes[i].price },
        });
      });
    });

    it('returns a summary of how many assets were refreshed', async () => {
      const result = await service.refreshAllQuotes();

      expect(result).toEqual({ refreshed: 3 });
    });
  });
});
