import { Test } from '@nestjs/testing';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendedPortfoliosController } from './recommended-portfolios.controller';
import { RecommendedPortfoliosModule } from './recommended-portfolios.module';
import { RecommendedPortfoliosService } from './recommended-portfolios.service';

/**
 * `RecommendedPortfoliosModule` compiled in isolation never pulls in the
 * app-wide `@Global()` `PrismaModule` on its own (CONVENTIONS.md ->
 * "Testing"), so `PrismaModule` is imported explicitly here and
 * `PrismaService` overridden with a stub rather than constructing a real
 * `PrismaPg` adapter against `DATABASE_URL` — same pattern as
 * `portfolio.module.spec.ts` (PORTFOLIO_SHARED_T-2) and
 * `market-data.module.spec.ts` (MARKET_DATA_SHARED_T-2).
 */
describe('RecommendedPortfoliosModule', () => {
  it('resolves RecommendedPortfoliosService and RecommendedPortfoliosController', async () => {
    const module = await Test.createTestingModule({
      imports: [RecommendedPortfoliosModule, PrismaModule],
    })
      .overrideProvider(PrismaService)
      .useValue({} as PrismaService)
      .compile();

    expect(module.get(RecommendedPortfoliosService)).toBeInstanceOf(RecommendedPortfoliosService);
    expect(module.get(RecommendedPortfoliosController)).toBeInstanceOf(
      RecommendedPortfoliosController,
    );
  });
});
