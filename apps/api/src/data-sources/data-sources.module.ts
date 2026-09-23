import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { RecommendedPortfoliosModule } from '../recommended-portfolios/recommended-portfolios.module';
import { AdvisorModule } from '../advisor/advisor.module';
import { DataSourcesController } from './data-sources.controller';
import { DataSourcesService } from './data-sources.service';

/**
 * `PrismaModule` is `@Global()`, so importing it in `AppModule` is normally
 * enough (CONVENTIONS.md -> "Module structure"); it's imported here too so
 * this module also resolves `PrismaService` when compiled standalone in a
 * `*.module.spec.ts`.
 *
 * `MarketDataModule`/`PortfolioModule`/`RecommendedPortfoliosModule`/
 * `AdvisorModule` are imported so `DataSourcesService.getSummary`
 * (DATA_SOURCES_SHARED_T-5) can compose their exported services rather than
 * querying `Asset`/`Holding`/`RecommendedPortfolio`/`AdvisorReport` directly
 * (spec.md -> API Contract: "`summary` composes the existing ... services
 * rather than re-querying their tables directly"). None of those modules
 * import `DataSourcesModule` back, so this introduces no cycle.
 */
@Module({
  imports: [
    PrismaModule,
    MarketDataModule,
    PortfolioModule,
    RecommendedPortfoliosModule,
    AdvisorModule,
  ],
  controllers: [DataSourcesController],
  providers: [DataSourcesService],
  exports: [DataSourcesService],
})
export class DataSourcesModule {}
