import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { ImportLog } from '../../generated/prisma/client';
import { DataSourcesService } from './data-sources.service';
import { CreateImportLogDto } from './dto/create-import-log.dto';
import { ListImportsQueryDto } from './dto/list-imports-query.dto';

/**
 * `AuthGuard` (CONVENTIONS.md -> "Auth") is applied at the class, so every
 * route this module grows later is per-user by default. The user id always
 * comes from `req.user.id` — no route here accepts one from the client.
 */
@Controller('data-sources')
@UseGuards(AuthGuard)
export class DataSourcesController {
  constructor(private readonly dataSourcesService: DataSourcesService) {}

  @Get('imports')
  async listImports(
    @Query() query: ListImportsQueryDto,
    @Req() req: Request,
  ): Promise<ImportLog[]> {
    const userId = (req.user as { id: string }).id;

    return this.dataSourcesService.listImports(userId, query.limit);
  }

  @Post('imports')
  async createImport(@Body() dto: CreateImportLogDto, @Req() req: Request): Promise<ImportLog> {
    const userId = (req.user as { id: string }).id;

    return this.dataSourcesService.createImport(userId, dto);
  }
}
