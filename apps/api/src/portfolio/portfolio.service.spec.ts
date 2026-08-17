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
    holding: { findUnique: jest.Mock; upsert: jest.Mock };
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
      },
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
});
