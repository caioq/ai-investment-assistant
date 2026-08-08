import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AssetQuote, MarketDataService } from './market-data.service';

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
}
