import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletType } from '../../generated/prisma/client';
import type { RecommendedPortfolio } from '../../generated/prisma/client';
import { parseWalletCsv } from './wallet-csv';
import { validateWalletRows } from './wallet-validation';

/**
 * Owns `RecommendedPortfolio`/`RecommendedHolding` (spec.md -> Data Model).
 */
@Injectable()
export class RecommendedPortfoliosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parses, normalises and validates the whole CSV (RECOMMENDED_PORTFOLIOS_US-1_T-1
   * through T-4) and, only once every row has passed, persists one
   * `RecommendedPortfolio` with its `RecommendedHolding[]` in a single nested
   * `create` — so a malformed row anywhere in the file never results in a
   * partial write (spec Behavior Note "A malformed row rejects the entire
   * upload"; see RECOMMENDED_PORTFOLIOS_US-1_T-4's "Done when").
   *
   * `assetId` is left `null` on every holding here: resolving `CODIGO` to an
   * `Asset` (creating it when unseen) is `RECOMMENDED_PORTFOLIOS_US-1_T-5`'s
   * `MarketDataService.findOrCreateAsset`, wired in by
   * `RECOMMENDED_PORTFOLIOS_US-1_T-6`'s upload endpoint — out of scope for
   * this task, which is solely about whole-file validation.
   */
  async uploadWallet(params: {
    userId: string;
    walletType: WalletType;
    csvText: string;
    effectiveDate: Date;
    sourceName?: string;
  }): Promise<RecommendedPortfolio> {
    const rawRows = parseWalletCsv(params.csvText);
    const normalizedRows = validateWalletRows(rawRows);

    return this.prisma.recommendedPortfolio.create({
      data: {
        userId: params.userId,
        walletType: params.walletType,
        effectiveDate: params.effectiveDate,
        sourceName: params.sourceName,
        holdings: {
          create: normalizedRows.map((row) => ({
            assetId: null,
            label: row.label,
            targetWeightPct: row.targetWeightPct,
            limitPrice: row.limitPrice,
            recommendation: row.recommendation,
            dividendYieldPct: row.dividendYieldPct,
            marginOfSafetyPct: row.marginOfSafetyPct,
          })),
        },
      },
      include: { holdings: true },
    });
  }
}
