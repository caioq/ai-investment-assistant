import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioListener } from './portfolio.listener';
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
/**
 * `PortfolioListener` (PORTFOLIO_US-5_T-2) is registered as a plain provider
 * here, not exported — its `@OnEvent` handler is discovered and wired up by
 * the app-wide `EventEmitterModule.forRoot()` (registered once in
 * `app.module.ts`, see CONVENTIONS.md -> "Scheduled jobs" for the same
 * pattern applied to `ScheduleModule.forRoot()`) as long as it's part of the
 * compiled app graph, which importing `PortfolioModule` into `AppModule`
 * already guarantees.
 */
@Module({
  imports: [PrismaModule, MarketDataModule],
  controllers: [PortfolioController],
  providers: [PortfolioService, PortfolioListener],
  exports: [PortfolioService],
})
export class PortfolioModule {}
