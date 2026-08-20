import { Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
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
    // `findOrCreateAsset` (RECOMMENDED_PORTFOLIOS_US-1_T-5) now lives on
    // `MarketDataService`, so this suite wires a *real* `MarketDataService`
    // instance backed by the same mocked `prisma` above, rather than
    // reimplementing its find-or-create + P2002-race logic a second time as
    // a test double (that logic and its own tests now live in
    // `market-data.service.spec.ts`). Only `backfillHistory` — the one
    // method that would otherwise reach out to a real `PriceProvider` — is
    // stubbed. This is what lets the concurrent-creation cases below keep
    // asserting directly against `prisma.asset`, unchanged from before the
    // refactor.
    const realMarketDataService = new MarketDataService(
      prisma as unknown as PrismaService,
      {} as never,
      { emit: jest.fn() } as never,
    );
    const backfillHistorySpy = jest
      .spyOn(realMarketDataService, 'backfillHistory')
      .mockResolvedValue(undefined) as unknown as jest.Mock;
    marketDataService = { backfillHistory: backfillHistorySpy };

    service = new PortfolioService(prisma as unknown as PrismaService, realMarketDataService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createHolding — concurrent creation of the same new Asset', () => {
    const userId = 'user-1';

    /**
     * Find-or-create on `Asset.ticker` is two statements, so two requests for
     * the same brand-new ticker can both see `null` from `findUnique` and both
     * attempt `create`. Postgres lets exactly one win; the other comes back
     * with Prisma's P2002 unique-constraint error. Real triggers: two users
     * adding the same new ticker at once, a double-clicked "Add", or a CSV
     * import racing another upload (`importHoldingsCsv` shares this path).
     */
    const uniqueViolation = () =>
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`ticker`)', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['ticker'] },
      });

    it('recovers when it loses the race: re-reads the winner’s Asset instead of surfacing a 500', async () => {
      const winnersAsset = { id: 'vale3-asset-id', ticker: 'VALE3' };
      // Lost the race: nothing found, create rejects, and the row now exists.
      prisma.asset.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(winnersAsset);
      prisma.asset.create.mockRejectedValueOnce(uniqueViolation());

      const holding = await service.createHolding(userId, 'VALE3', 100, 30);

      expect(holding.assetId).toBe(winnersAsset.id);
      expect(prisma.holding.upsert).toHaveBeenCalledTimes(1);
    });

    it('does not fire backfillHistory when it lost the race — the winner already triggered it', async () => {
      prisma.asset.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'vale3-asset-id', ticker: 'VALE3' });
      prisma.asset.create.mockRejectedValueOnce(uniqueViolation());

      await service.createHolding(userId, 'VALE3', 100, 30);

      // Double-backfilling would issue a second 1y Yahoo Finance fetch for a
      // ticker that already has its history, against a rate-limited upstream.
      expect(marketDataService.backfillHistory).not.toHaveBeenCalled();
    });

    it('still fires backfillHistory exactly once when it wins the race', async () => {
      prisma.asset.findUnique.mockResolvedValueOnce(null);

      await service.createHolding(userId, 'VALE3', 100, 30);

      expect(marketDataService.backfillHistory).toHaveBeenCalledTimes(1);
    });

    it('rethrows a non-P2002 Prisma failure rather than masking it as a lost race', async () => {
      prisma.asset.findUnique.mockResolvedValueOnce(null);
      prisma.asset.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Connection pool timeout', {
          code: 'P2024',
          clientVersion: 'test',
        }),
      );

      await expect(service.createHolding(userId, 'VALE3', 100, 30)).rejects.toMatchObject({
        code: 'P2024',
      });
    });
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
