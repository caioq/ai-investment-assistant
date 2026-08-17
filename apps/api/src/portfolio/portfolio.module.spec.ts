import { Test } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioController } from './portfolio.controller';
import { PortfolioModule } from './portfolio.module';
import { PortfolioService } from './portfolio.service';

/**
 * `PortfolioModule` compiled in isolation never pulls in the app-wide
 * `@Global()` `PrismaModule` on its own (CONVENTIONS.md -> "Testing"), so
 * `PrismaModule` is imported explicitly here and `PrismaService` is
 * overridden with a stub rather than constructing a real `PrismaPg` adapter
 * against `DATABASE_URL` — same pattern as
 * `market-data.module.spec.ts` (MARKET_DATA_SHARED_T-2).
 */
describe('PortfolioModule', () => {
  it('resolves PortfolioService and PortfolioController', async () => {
    const module = await Test.createTestingModule({
      // `PortfolioModule` imports `MarketDataModule` (for
      // `MarketDataService.backfillHistory`), whose `MarketDataService` now
      // also injects `EventEmitter2` (added by `PORTFOLIO_US-5_T-2`),
      // normally satisfied by the app-wide `EventEmitterModule.forRoot()`
      // registered once in `app.module.ts` — added here for the same reason
      // `market-data.module.spec.ts` adds it to its own isolated compile.
      imports: [PortfolioModule, PrismaModule, EventEmitterModule.forRoot()],
    })
      .overrideProvider(PrismaService)
      .useValue({} as PrismaService)
      .compile();

    expect(module.get(PortfolioService)).toBeInstanceOf(PortfolioService);
    expect(module.get(PortfolioController)).toBeInstanceOf(PortfolioController);
  });
});
