import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { PortfolioService } from './portfolio.service';

/**
 * Unit test with a mocked `PrismaService` per CONVENTIONS.md -> "Testing" —
 * direct instantiation (not `Test.createTestingModule`), same pattern as
 * `market-data.service.spec.ts`. No multipart/HTTP machinery involved; this
 * exercises `importHoldingsCsv`'s parse/validate/upsert logic against
 * in-memory CSV strings only (PORTFOLIO_US-2_T-2 owns the multipart wrapper).
 */
describe('PortfolioService', () => {
  let service: PortfolioService;
  let prisma: {
    asset: { findUnique: jest.Mock; create: jest.Mock };
    holding: { findUnique: jest.Mock; upsert: jest.Mock; findMany: jest.Mock };
    portfolioValueSnapshot: { upsert: jest.Mock };
  };
  let marketDataService: { backfillHistory: jest.Mock };

  beforeEach(() => {
    prisma = {
      asset: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation((args: { data: { ticker: string } }) =>
            Promise.resolve({ id: `${args.data.ticker}-asset-id`, ticker: args.data.ticker }),
          ),
      },
      holding: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest
          .fn()
          .mockImplementation(
            (args: {
              where: { userId_assetId: { userId: string; assetId: string } };
              create: { quantity: number; avgPrice: number };
            }) =>
              Promise.resolve({
                id: `${args.where.userId_assetId.assetId}-holding-id`,
                userId: args.where.userId_assetId.userId,
                assetId: args.where.userId_assetId.assetId,
                quantity: args.create.quantity,
                avgPrice: args.create.avgPrice,
              }),
          ),
        findMany: jest.fn(),
      },
      portfolioValueSnapshot: { upsert: jest.fn().mockResolvedValue(undefined) },
    };
    marketDataService = { backfillHistory: jest.fn().mockResolvedValue(undefined) };

    service = new PortfolioService(
      prisma as unknown as PrismaService,
      marketDataService as unknown as MarketDataService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('importHoldingsCsv', () => {
    const userId = 'user-1';

    it('spec AC-3: 3 valid rows + 1 malformed row (PETR4,abc,30) yields created: 3 and 1 error, without throwing, and still writes the valid rows', async () => {
      const csv = [
        'ticker,quantity,avgPrice',
        'VALE3,50,60',
        'ITUB4,200,25',
        'BBDC4,10,15',
        'PETR4,abc,30',
      ].join('\n');

      const result = await service.importHoldingsCsv(userId, csv);

      expect(result.created).toBe(3);
      expect(result.errors).toHaveLength(1);
      // The three valid upserts were actually issued, not rolled back by a
      // single-transaction implementation that would return the right
      // counts while persisting nothing.
      expect(prisma.holding.upsert).toHaveBeenCalledTimes(3);
    });

    it('names the offending row number and reason in the error string', async () => {
      const csv = ['ticker,quantity,avgPrice', 'PETR4,abc,30'].join('\n');

      const result = await service.importHoldingsCsv(userId, csv);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('row 1');
      expect(result.errors[0].toLowerCase()).toContain('quantity');
    });

    it('reports already-held tickers as updated, not created, and is idempotent on re-import', async () => {
      const existingAsset = { id: 'existing-asset-id', ticker: 'PETR4' };
      const existingHolding = {
        id: 'existing-holding-id',
        userId,
        assetId: existingAsset.id,
        quantity: 10,
        avgPrice: 20,
      };
      prisma.asset.findUnique.mockResolvedValue(existingAsset);
      prisma.holding.findUnique.mockResolvedValue(existingHolding);

      const csv = ['ticker,quantity,avgPrice', 'PETR4,100,30'].join('\n');

      const first = await service.importHoldingsCsv(userId, csv);
      const second = await service.importHoldingsCsv(userId, csv);

      expect(first).toEqual({ created: 0, updated: 1, errors: [] });
      expect(second).toEqual({ created: 0, updated: 1, errors: [] });
      expect(prisma.asset.create).not.toHaveBeenCalled();
    });

    it('reports no error for a blank trailing newline', async () => {
      const csv = ['ticker,quantity,avgPrice', 'PETR4,100,30', ''].join('\n');

      const result = await service.importHoldingsCsv(userId, csv);

      expect(result.errors).toHaveLength(0);
      expect(result.created).toBe(1);
    });

    it('normalises lowercase tickers to the same Asset as uppercase, per PORTFOLIO_US-1_T-1', async () => {
      const csv = ['ticker,quantity,avgPrice', 'petr4,100,30'].join('\n');

      await service.importHoldingsCsv(userId, csv);

      expect(prisma.asset.findUnique).toHaveBeenCalledWith({ where: { ticker: 'PETR4' } });
    });
  });

  describe('snapshotAllUsers', () => {
    it('writes one PortfolioValueSnapshot row per user, hand-computed from seeded holdings, falling back to avgPrice for an unpriced asset', async () => {
      prisma.holding.findMany.mockResolvedValue([
        // user-1: one priced asset, one unpriced (currentPrice: null) asset.
        {
          userId: 'user-1',
          quantity: 100,
          avgPrice: 30,
          asset: { currentPrice: 38.5 },
        },
        {
          userId: 'user-1',
          quantity: 10,
          avgPrice: 50,
          asset: { currentPrice: null },
        },
        // user-2: single priced asset.
        {
          userId: 'user-2',
          quantity: 5,
          avgPrice: 100,
          asset: { currentPrice: 120 },
        },
      ]);

      await service.snapshotAllUsers();

      expect(prisma.portfolioValueSnapshot.upsert).toHaveBeenCalledTimes(2);

      // user-1: totalValue = 100*38.5 + 10*50 (?? avgPrice fallback) = 3850 + 500 = 4350
      //         totalInvested = 100*30 + 10*50 = 3000 + 500 = 3500
      expect(prisma.portfolioValueSnapshot.upsert).toHaveBeenCalledWith({
        where: { userId_date: { userId: 'user-1', date: expect.any(Date) } },
        update: { totalValue: 4350, totalInvested: 3500 },
        create: {
          userId: 'user-1',
          date: expect.any(Date),
          totalValue: 4350,
          totalInvested: 3500,
        },
      });

      // user-2: totalValue = 5*120 = 600, totalInvested = 5*100 = 500
      expect(prisma.portfolioValueSnapshot.upsert).toHaveBeenCalledWith({
        where: { userId_date: { userId: 'user-2', date: expect.any(Date) } },
        update: { totalValue: 600, totalInvested: 500 },
        create: {
          userId: 'user-2',
          date: expect.any(Date),
          totalValue: 600,
          totalInvested: 500,
        },
      });
    });

    it('upserts on (userId, date), so a second call for the same day updates rather than throwing', async () => {
      prisma.holding.findMany.mockResolvedValue([
        { userId: 'user-1', quantity: 10, avgPrice: 20, asset: { currentPrice: 25 } },
      ]);

      await service.snapshotAllUsers();
      await expect(service.snapshotAllUsers()).resolves.not.toThrow();

      expect(prisma.portfolioValueSnapshot.upsert).toHaveBeenCalledTimes(2);
      const [firstCallArgs, secondCallArgs] = prisma.portfolioValueSnapshot.upsert.mock.calls;
      expect(firstCallArgs[0].where).toEqual(secondCallArgs[0].where);
    });

    it("does not let one user's write failure prevent the next user's row from being written", async () => {
      prisma.holding.findMany.mockResolvedValue([
        { userId: 'user-1', quantity: 10, avgPrice: 20, asset: { currentPrice: 25 } },
        { userId: 'user-2', quantity: 5, avgPrice: 100, asset: { currentPrice: 120 } },
      ]);
      prisma.portfolioValueSnapshot.upsert
        .mockRejectedValueOnce(new Error('write failed for user-1'))
        .mockResolvedValueOnce(undefined);
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await expect(service.snapshotAllUsers()).resolves.not.toThrow();

      expect(prisma.portfolioValueSnapshot.upsert).toHaveBeenCalledTimes(2);
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});
