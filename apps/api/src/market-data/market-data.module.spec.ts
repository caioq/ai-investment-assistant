import { Test } from '@nestjs/testing';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketDataModule } from './market-data.module';
import { MarketDataService } from './market-data.service';
import { PRICE_PROVIDER } from './providers/price-provider.interface';
import { PrismaService } from '../prisma/prisma.service';

// `MarketDataService` depends on `PrismaService` (added by
// `MARKET_DATA_US-2_T-2`'s `backfillHistory`, extended by
// `MARKET_DATA_US-3_T-1`'s `syncIbovespa`), which is normally satisfied by
// the app-wide `@Global()` `PrismaModule` (see CONVENTIONS.md -> "Module
// structure") — but this spec compiles `MarketDataModule` in isolation, so
// that global registration never happens implicitly. `PrismaModule` is
// imported explicitly here (only in the test) and its `PrismaService`
// overridden with a stub, rather than constructing a real `PrismaPg`
// adapter against `DATABASE_URL`.
const prismaStub = {} as PrismaService;

/**
 * `MarketDataService` now injects `PrismaService` (added by
 * `MARKET_DATA_US-1_T-2`). `PrismaModule` is `@Global()` so app-level
 * consumers of `MarketDataModule` never need to import it themselves (see
 * CONVENTIONS.md -> "Module structure"), but a module compiled in isolation
 * here still needs it in the graph for that global registration to happen.
 */
describe('MarketDataModule', () => {
  it('resolves a PriceProvider behind the PRICE_PROVIDER token', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, MarketDataModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    const provider = module.get(PRICE_PROVIDER);

    expect(typeof provider.getQuote).toBe('function');
    expect(typeof provider.getHistory).toBe('function');
  });

  it('resolves MarketDataService', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, MarketDataModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    expect(module.get(MarketDataService)).toBeInstanceOf(MarketDataService);
  });
});
