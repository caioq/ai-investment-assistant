import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { RecommendedPortfoliosController } from './recommended-portfolios.controller';
import { RecommendedPortfoliosService } from './recommended-portfolios.service';

/**
 * `PrismaModule` is `@Global()`, so `AppModule` importing it elsewhere is
 * normally enough (CONVENTIONS.md -> "Module structure"). It's imported
 * here too so `RecommendedPortfoliosModule` also resolves `PrismaService`
 * when compiled standalone (as `recommended-portfolios.module.spec.ts`
 * does) rather than only as part of the full app graph.
 *
 * `MarketDataModule` is imported so `RecommendedPortfoliosService` can
 * inject `MarketDataService` (`.findOrCreateAsset`) — RECOMMENDED_PORTFOLIOS_US-1_T-6
 * resolves each row's `CODIGO` to an `Asset` this way, same as
 * `PortfolioModule` (see its own module file).
 */
@Module({
  imports: [PrismaModule, MarketDataModule],
  controllers: [RecommendedPortfoliosController],
  providers: [RecommendedPortfoliosService],
  exports: [RecommendedPortfoliosService],
})
export class RecommendedPortfoliosModule {}
