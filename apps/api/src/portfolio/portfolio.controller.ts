import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CreateHoldingDto } from './dto/create-holding.dto';
import { UpdateHoldingDto } from './dto/update-holding.dto';
import { ImportHoldingsCsvResult, PortfolioService } from './portfolio.service';
import { Asset, Holding } from '../../generated/prisma/client';

/** 1 MB — far beyond any realistic holdings CSV; caps the in-memory upload
 * so an authenticated endpoint can't be used to exhaust process memory
 * (see task PORTFOLIO_US-2_T-2). */
const MAX_CSV_UPLOAD_BYTES = 1024 * 1024;

/**
 * `AuthGuard` (CONVENTIONS.md -> "Auth") is applied once here, at the
 * controller class, rather than per-handler — every endpoint this module
 * adds is scoped to `req.user.id` (spec.md -> API Contract preamble), so
 * guarding the class means a handler added later is protected by default
 * instead of relying on someone remembering to decorate it individually
 * (see PORTFOLIO_US-1_T-5, which exists to catch exactly that omission).
 */
@Controller('portfolio')
@UseGuards(AuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Post('holdings')
  async createHolding(@Body() dto: CreateHoldingDto, @Req() req: Request): Promise<Holding> {
    const userId = (req.user as { id: string }).id;

    return this.portfolioService.createHolding(userId, dto.ticker, dto.quantity, dto.avgPrice);
  }

  @Get('holdings')
  async listHoldings(@Req() req: Request): Promise<(Holding & { asset: Asset })[]> {
    const userId = (req.user as { id: string }).id;

    return this.portfolioService.listHoldings(userId);
  }

  @Patch('holdings/:id')
  async updateHolding(
    @Param('id') id: string,
    @Body() dto: UpdateHoldingDto,
    @Req() req: Request,
  ): Promise<Holding> {
    const userId = (req.user as { id: string }).id;

    return this.portfolioService.updateHolding(userId, id, dto);
  }

  @Delete('holdings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHolding(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const userId = (req.user as { id: string }).id;

    await this.portfolioService.deleteHolding(userId, id);
  }

  /**
   * Thin multipart wrapper (PORTFOLIO_US-2_T-2) over
   * `PortfolioService.importHoldingsCsv` (PORTFOLIO_US-2_T-1), which owns all
   * row parsing/validation/upsert logic — this handler only decodes the
   * uploaded buffer to a UTF-8 string and delegates.
   *
   * `FileInterceptor`'s default storage is in-memory (`file.buffer`), which
   * is what's wanted here since the file is parsed immediately and never
   * needs to touch disk. `limits.fileSize` caps the upload at
   * `MAX_CSV_UPLOAD_BYTES` so this authenticated endpoint can't be used to
   * exhaust memory with an unbounded upload.
   */
  @Post('holdings/upload-csv')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_CSV_UPLOAD_BYTES } }))
  async uploadHoldingsCsv(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ): Promise<ImportHoldingsCsvResult> {
    if (!file) {
      throw new BadRequestException('No file attached');
    }

    const userId = (req.user as { id: string }).id;
    const csv = file.buffer.toString('utf-8');

    return this.portfolioService.importHoldingsCsv(userId, csv);
  }
}
