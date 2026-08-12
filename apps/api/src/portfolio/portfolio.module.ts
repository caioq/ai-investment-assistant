import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

/**
 * `PrismaModule` is `@Global()`, so importing it in `AppModule` is normally
 * enough (CONVENTIONS.md -> "Module structure"). It's imported here too so
 * `PortfolioModule` also resolves `PrismaService` when compiled standalone
 * (as `portfolio.module.spec.ts` does) rather than only as part of the full
 * app graph.
 *
 * `MarketDataModule` is imported so `PortfolioService` can inject
 * `MarketDataService` (`.backfillHistory`) — PORTFOLIO_US-1_T-1 triggers the
 * historical backfill for a newly-created `Asset` right after creating a
 * `Holding` for it.
 */
@Module({
  imports: [PrismaModule, MarketDataModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
