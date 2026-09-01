import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { RecommendedPortfoliosModule } from '../recommended-portfolios/recommended-portfolios.module';
import { AdvisorController } from './advisor.controller';
import { AdvisorService } from './advisor.service';

/**
 * `PrismaModule` is `@Global()`, so `AppModule` importing it elsewhere is
 * normally enough (CONVENTIONS.md -> "Module structure"). It's imported
 * here too so `AdvisorModule` also resolves `PrismaService` when compiled
 * standalone (as `advisor.module.spec.ts` does) rather than only as part of
 * the full app graph.
 *
 * `PortfolioModule` and `RecommendedPortfoliosModule` are imported for
 * their exported `PortfolioService`/`RecommendedPortfoliosService` — spec.md
 * -> Behavior Notes has `ADVISOR_US-2_T-2`'s prompt builder read both
 * modules through their services, never their tables directly, same
 * one-way-boundary rule `market-data`'s spec states applied in this
 * direction (advisor -> portfolio/recommended-portfolios).
 */
@Module({
  imports: [PrismaModule, PortfolioModule, RecommendedPortfoliosModule],
  controllers: [AdvisorController],
  providers: [AdvisorService],
  exports: [AdvisorService],
})
export class AdvisorModule {}
