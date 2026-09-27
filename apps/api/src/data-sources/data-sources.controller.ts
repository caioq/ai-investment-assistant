import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { ImportLog } from '../../generated/prisma/client';
import { DataSourcesService, DataSourcesSummary } from './data-sources.service';
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

  /**
   * `GET /data-sources/summary` (DATA_SOURCES_SHARED_T-5, spec.md -> API
   * Contract) — everything the four source cards and the preview need in
   * one call. All the actual composition lives in
   * `DataSourcesService.getSummary`; this handler stays thin per
   * CONVENTIONS.md -> "Module structure".
   */
  @Get('summary')
  async getSummary(@Req() req: Request): Promise<DataSourcesSummary> {
    const userId = (req.user as { id: string }).id;

    return this.dataSourcesService.getSummary(userId);
  }

  /**
   * `GET /data-sources/imports` — cursor-paginated by `?cursor=` (the id of
   * the previous page's last row). The body stays a plain `ImportLog[]`
   * (spec.md -> API Contract); the next page's cursor rides on the
   * `X-Next-Cursor` response header instead, and is only sent when there is
   * a next page, so its presence alone tells the client whether to keep
   * paging.
   */
  @Get('imports')
  async listImports(
    @Query() query: ListImportsQueryDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ImportLog[]> {
    const userId = (req.user as { id: string }).id;

    const { items, nextCursor } = await this.dataSourcesService.listImports(
      userId,
      query.limit,
      query.cursor,
    );

    if (nextCursor) {
      res.setHeader('X-Next-Cursor', nextCursor);
    }

    return items;
  }

  @Post('imports')
  async createImport(@Body() dto: CreateImportLogDto, @Req() req: Request): Promise<ImportLog> {
    const userId = (req.user as { id: string }).id;

    return this.dataSourcesService.createImport(userId, dto);
  }
}
