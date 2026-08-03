import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { SharedInfoService } from './health/shared-info.service';
import { MarketDataModule } from './market-data/market-data.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, MarketDataModule],
  controllers: [HealthController],
  providers: [SharedInfoService],
})
export class AppModule {}
