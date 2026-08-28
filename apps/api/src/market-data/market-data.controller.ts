import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { MAX_CSV_UPLOAD_BYTES } from '../common/file-upload.constants';
import { PrismaService } from '../prisma/prisma.service';
import { AssetQuote, ImportAssetsCsvResult, MarketDataService } from './market-data.service';

/**
 * `GET /market-data/quote/:ticker` — the module's one optional debug
 * endpoint (spec.md -> API Contract): "for manual/debug use, not called by
 * the frontend". Guarded by the shared `AuthGuard` (CONVENTIONS.md ->
 * "Auth") even though it's debug-only, since it can trigger a live Yahoo
 * Finance request via `getOrRefreshPrice` — see this task's own rationale.
 * Kept thin per CONVENTIONS.md -> "Module structure": resolves the `Asset`
 * by ticker and delegates all price logic to `MarketDataService`.
 */
@Controller('market-data')
export class MarketDataController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
  ) {}

  @Get('quote/:ticker')
  @UseGuards(AuthGuard)
  async getQuote(@Param('ticker') ticker: string): Promise<AssetQuote> {
    const asset = await this.prisma.asset.findUnique({ where: { ticker } });
    if (!asset) {
      throw new NotFoundException(`No Asset found for ticker '${ticker}'`);
    }

    return this.marketDataService.getOrRefreshPrice(asset.id);
  }

  /**
   * `POST /market-data/assets/import` (spec.md -> API Contract,
   * MARKET_DATA_US-5_T-5). Thin multipart wrapper over
   * `MarketDataService.importAssetsCsv`, which owns all row
   * parsing/normalisation/persistence (T-2 through T-4) — this handler only
   * decodes the uploaded buffer to a UTF-8 string and delegates.
   *
   * Guarded the same as the sibling `GET /market-data/quote/:ticker`
   * (CONVENTIONS.md -> "Auth"): this endpoint writes shared master data
   * every user's allocation view reads, so it needs the guard at least as
   * much as the read endpoint does.
   *
   * `FileInterceptor`'s default storage is in-memory (`file.buffer`), which
   * is what's wanted here since the file is parsed immediately and never
   * needs to touch disk. `limits.fileSize` caps the upload at
   * `MAX_CSV_UPLOAD_BYTES` (CONVENTIONS.md -> "File uploads") so this
   * authenticated endpoint can't be used to exhaust memory with an
   * unbounded upload.
   */
  @Post('assets/import')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_CSV_UPLOAD_BYTES } }))
  async importAssets(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ImportAssetsCsvResult> {
    if (!file) {
      throw new BadRequestException('No file attached');
    }

    const csvText = file.buffer.toString('utf-8');

    return this.marketDataService.importAssetsCsv(csvText);
  }
}
