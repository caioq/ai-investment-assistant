import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { RecommendedHolding, RecommendedPortfolio } from '../../generated/prisma/client';
import { UploadWalletBodyDto } from './dto/upload-wallet-body.dto';
import { UploadWalletQueryDto } from './dto/upload-wallet-query.dto';
import { parseEffectiveDate } from './wallet-date';
import {
  RecommendedPortfoliosService,
  RecommendedPortfolioWithHoldings,
} from './recommended-portfolios.service';

/** 1 MB — far beyond any realistic wallet export CSV; caps the in-memory
 * upload so an authenticated endpoint can't be used to exhaust process
 * memory (same rationale/limit as `PortfolioController.uploadHoldingsCsv`,
 * CONVENTIONS.md -> "File uploads"). */
const MAX_CSV_UPLOAD_BYTES = 1024 * 1024;

/**
 * Route prefix is `advisor/recommended-portfolios`, not
 * `recommended-portfolios` — matches the spec's API Contract
 * (`POST /advisor/recommended-portfolios/upload`,
 * `GET /advisor/recommended-portfolios/latest`). The mismatch with the
 * module directory name is intentional: these endpoints sit on the advisor
 * surface the frontend talks to, while the code lives in its own module
 * because it owns its own models (spec.md, RECOMMENDED_PORTFOLIOS_SHARED_T-2).
 * Don't "fix" the prefix to match the folder.
 *
 * `AuthGuard` (CONVENTIONS.md -> "Auth") is applied once here, at the
 * controller class, rather than per-handler — every row this module writes
 * carries a `userId` that always comes from `req.user.id`, so guarding the
 * class means a handler added later is protected by default instead of
 * relying on someone remembering to decorate it individually.
 */
@Controller('advisor/recommended-portfolios')
@UseGuards(AuthGuard)
export class RecommendedPortfoliosController {
  constructor(private readonly recommendedPortfoliosService: RecommendedPortfoliosService) {}

  /**
   * Thin multipart wrapper (RECOMMENDED_PORTFOLIOS_US-1_T-6) over
   * `RecommendedPortfoliosService.uploadWallet`, which owns all CSV parsing,
   * normalisation and validation (US-1_T-1 through T-4) plus asset
   * resolution (US-1_T-5) — this handler only decodes the uploaded buffer to
   * a UTF-8 string, resolves `effectiveDate`'s default, and delegates.
   *
   * `wallet` is validated by `UploadWalletQueryDto`'s `@IsEnum(WalletType)`
   * behind the global `ValidationPipe`, so an unrecognised value 400s before
   * this handler ever runs. `userId` always comes from `req.user.id`, never
   * the request body (spec.md -> API Contract preamble).
   *
   * `FileInterceptor`'s default storage is in-memory (`file.buffer`), which
   * is what's wanted here since the file is parsed immediately and never
   * needs to touch disk. `limits.fileSize` caps the upload at
   * `MAX_CSV_UPLOAD_BYTES` so this authenticated endpoint can't be used to
   * exhaust memory with an unbounded upload.
   */
  @Post('upload')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_CSV_UPLOAD_BYTES } }))
  async uploadWallet(
    @Query() query: UploadWalletQueryDto,
    @Body() body: UploadWalletBodyDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ): Promise<RecommendedPortfolio & { holdings: RecommendedHolding[] }> {
    if (!file) {
      throw new BadRequestException('No file attached');
    }

    const userId = (req.user as { id: string }).id;
    const csvText = file.buffer.toString('utf-8');

    return this.recommendedPortfoliosService.uploadWallet({
      userId,
      walletType: query.wallet,
      csvText,
      effectiveDate: parseEffectiveDate(body.effectiveDate),
      sourceName: body.sourceName,
    });
  }

  /**
   * `GET /advisor/recommended-portfolios/latest` (spec.md -> API Contract,
   * RECOMMENDED_PORTFOLIOS_US-3_T-1). Scoped to `req.user.id` — no
   * `userId` is ever accepted from the client (CONVENTIONS.md -> "Auth").
   * A user with nothing uploaded gets `200` and `[]`, not `404` — "no
   * recommendations yet" is a normal state for a new account.
   */
  @Get('latest')
  async getLatest(@Req() req: Request): Promise<RecommendedPortfolioWithHoldings[]> {
    const userId = (req.user as { id: string }).id;

    return this.recommendedPortfoliosService.getLatestPerWallet(userId);
  }
}
