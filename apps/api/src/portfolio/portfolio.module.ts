import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

/**
 * `PrismaModule` is `@Global()`, so importing it in `AppModule` is normally
 * enough (CONVENTIONS.md -> "Module structure"). It's imported here too so
 * `PortfolioModule` also resolves `PrismaService` when compiled standalone
 * (as `portfolio.module.spec.ts` does) rather than only as part of the full
 * app graph.
 */
@Module({
  imports: [PrismaModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
