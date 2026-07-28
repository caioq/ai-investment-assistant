import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { SharedInfoService } from './health/shared-info.service';

@Module({
  imports: [],
  controllers: [HealthController],
  providers: [SharedInfoService],
})
export class AppModule {}
