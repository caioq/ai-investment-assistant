import { Test } from '@nestjs/testing';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketDataModule } from './market-data.module';
import { MarketDataService } from './market-data.service';
import { PRICE_PROVIDER } from './providers/price-provider.interface';

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
    }).compile();

    const provider = module.get(PRICE_PROVIDER);

    expect(typeof provider.getQuote).toBe('function');
    expect(typeof provider.getHistory).toBe('function');
  });

  it('resolves MarketDataService', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, MarketDataModule],
    }).compile();

    expect(module.get(MarketDataService)).toBeInstanceOf(MarketDataService);
  });
});
