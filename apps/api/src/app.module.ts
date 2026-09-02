import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AdvisorModule } from './advisor/advisor.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { SharedInfoService } from './health/shared-info.service';
import { MarketDataModule } from './market-data/market-data.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecommendedPortfoliosModule } from './recommended-portfolios/recommended-portfolios.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Registered once here, per @nestjs/event-emitter's convention of a
    // single root-level forRoot() (mirrors ScheduleModule.forRoot() above) —
    // market-data emits 'market-data.refresh.completed'
    // (PORTFOLIO_US-5_T-2), portfolio subscribes via
    // PortfolioListener. Modules that need EventEmitter2/@OnEvent at compile
    // time in an isolated *.module.spec.ts add EventEmitterModule.forRoot()
    // to that test's own imports, same pattern as ScheduleModule.forRoot()
    // in market-data.cron.spec.ts.
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    MarketDataModule,
    PortfolioModule,
    RecommendedPortfoliosModule,
    AdvisorModule,
  ],
  controllers: [HealthController],
  providers: [SharedInfoService],
})
export class AppModule {}
