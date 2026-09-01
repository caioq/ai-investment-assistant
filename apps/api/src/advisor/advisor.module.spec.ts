import { Test } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AdvisorModule } from './advisor.module';
import { AdvisorService } from './advisor.service';

/**
 * `AdvisorService` injects `PrismaService`, normally satisfied by the
 * app-wide `@Global()` `PrismaModule` (see CONVENTIONS.md -> "Module
 * structure") — but this spec compiles `AdvisorModule` in isolation, so
 * that global registration never happens implicitly. `PrismaModule` is
 * imported explicitly here (only in the test) and its `PrismaService`
 * overridden with a stub, rather than constructing a real `PrismaPg`
 * adapter against `DATABASE_URL` (CONVENTIONS.md -> "Testing").
 */
const prismaStub = {} as PrismaService;

describe('AdvisorModule', () => {
  it('compiles and resolves AdvisorService', async () => {
    const module = await Test.createTestingModule({
      // `AdvisorModule` imports `PortfolioModule`, which in turn imports
      // `MarketDataModule` — `MarketDataService` injects `EventEmitter2`
      // (PORTFOLIO_US-5_T-2), normally satisfied by the app-wide
      // `EventEmitterModule.forRoot()` registered once in `app.module.ts`
      // (CONVENTIONS.md -> "Cross-module events"). Added to this standalone
      // module test's own imports, same as `market-data.module.spec.ts`.
      imports: [PrismaModule, EventEmitterModule.forRoot(), AdvisorModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    expect(module.get(AdvisorService)).toBeInstanceOf(AdvisorService);
  });
});
