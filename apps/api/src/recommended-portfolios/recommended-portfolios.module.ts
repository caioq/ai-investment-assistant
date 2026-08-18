import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RecommendedPortfoliosController } from './recommended-portfolios.controller';
import { RecommendedPortfoliosService } from './recommended-portfolios.service';

/**
 * `PrismaModule` is `@Global()`, so importing it in `AppModule` is normally
 * enough (CONVENTIONS.md -> "Module structure"). It's imported here too so
 * `RecommendedPortfoliosModule` also resolves `PrismaService` when compiled
 * standalone (as `recommended-portfolios.module.spec.ts` does) rather than
 * only as part of the full app graph — same as `PortfolioModule`.
 */
@Module({
  imports: [PrismaModule],
  controllers: [RecommendedPortfoliosController],
  providers: [RecommendedPortfoliosService],
  exports: [RecommendedPortfoliosService],
})
export class RecommendedPortfoliosModule {}
