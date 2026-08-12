import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { SharedInfoService } from './health/shared-info.service';
import { MarketDataModule } from './market-data/market-data.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    MarketDataModule,
    PortfolioModule,
  ],
  controllers: [HealthController],
  providers: [SharedInfoService],
})
export class AppModule {}
