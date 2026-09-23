import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DataSourcesController } from './data-sources.controller';
import { DataSourcesService } from './data-sources.service';

/**
 * `PrismaModule` is `@Global()`, so importing it in `AppModule` is normally
 * enough (CONVENTIONS.md -> "Module structure"); it's imported here too so
 * this module also resolves `PrismaService` when compiled standalone in a
 * `*.module.spec.ts`.
 */
@Module({
  imports: [PrismaModule],
  controllers: [DataSourcesController],
  providers: [DataSourcesService],
  exports: [DataSourcesService],
})
export class DataSourcesModule {}
