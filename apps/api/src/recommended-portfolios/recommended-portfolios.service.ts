import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import {
  RecommendedHolding,
  RecommendedPortfolio,
  WalletType,
} from '../../generated/prisma/client';
import { parseWalletCsv } from './wallet-csv';
import { validateWalletRows } from './wallet-validation';

export type RecommendedPortfolioWithHoldings = RecommendedPortfolio & {
  holdings: RecommendedHolding[];
};

/**
 * Owns `RecommendedPortfolio`/`RecommendedHolding` (spec.md -> Data Model).
 */
@Injectable()
export class RecommendedPortfoliosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
  ) {}

  /**
   * Parses, normalises and validates the whole CSV (RECOMMENDED_PORTFOLIOS_US-1_T-1
   * through T-4) and, only once every row has passed, resolves each row's
   * ticker to an `Asset` and persists one `RecommendedPortfolio` with its
   * `RecommendedHolding[]` in a single nested `create` — so a malformed row
   * anywhere in the file never results in a partial write (spec Behavior Note
   * "A malformed row rejects the entire upload"; see
   * RECOMMENDED_PORTFOLIOS_US-1_T-4's "Done when").
   *
   * Asset resolution (RECOMMENDED_PORTFOLIOS_US-1_T-6) delegates to
   * `MarketDataService.findOrCreateAsset` (RECOMMENDED_PORTFOLIOS_US-1_T-5),
   * which `market-data` owns (uppercase normalisation, P2002 race recovery).
   * `wasCreated` is deliberately ignored — unlike `PortfolioService`, this
   * module never triggers `backfillHistory` for a newly-created `Asset`: a
   * recommended wallet has no performance chart and only needs
   * `currentPrice`, which market-data's daily cron already supplies by
   * iterating `Asset` rows (spec Behavior Notes). A row with no ticker (the
   * Overall wallet's tickerless fixed-income line) resolves no asset at all
   * and is stored with `assetId: null`.
   */
  async uploadWallet(params: {
    userId: string;
    walletType: WalletType;
    csvText: string;
    effectiveDate: Date;
    sourceName?: string;
  }): Promise<RecommendedPortfolio & { holdings: RecommendedHolding[] }> {
    const rawRows = parseWalletCsv(params.csvText);
    const normalizedRows = validateWalletRows(rawRows);

    const assetIds: (string | null)[] = [];
    for (const row of normalizedRows) {
      if (row.ticker === null) {
        assetIds.push(null);
        continue;
      }

      const { asset } = await this.marketDataService.findOrCreateAsset(row.ticker);
      assetIds.push(asset.id);
    }

    return this.prisma.recommendedPortfolio.create({
      data: {
        userId: params.userId,
        walletType: params.walletType,
        effectiveDate: params.effectiveDate,
        sourceName: params.sourceName,
        holdings: {
          create: normalizedRows.map((row, index) => ({
            assetId: assetIds[index],
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

  /**
   * Latest `RecommendedPortfolio` per `walletType` for `userId`, with its
   * `holdings` included (spec.md -> API Contract, RECOMMENDED_PORTFOLIOS_US-3_T-1).
   *
   * Fetches everything for the user ordered by `effectiveDate` desc, then
   * `uploadedAt` desc (spec.md -> Behavior Notes: the tie-break is
   * load-bearing since `effectiveDate` defaults to today and history is
   * additive, so two same-day uploads are common), and keeps only the
   * first row seen per `walletType` in JS rather than relying on Prisma's
   * `distinct` (whose SQL translation isn't guaranteed to honor multi-field
   * ordering the same way across drivers) — explicit and easy to verify
   * against the spec's own wording.
   */
  async getLatestPerWallet(userId: string): Promise<RecommendedPortfolioWithHoldings[]> {
    const portfolios = await this.prisma.recommendedPortfolio.findMany({
      where: { userId },
      orderBy: [{ effectiveDate: 'desc' }, { uploadedAt: 'desc' }],
      include: { holdings: true },
    });

    const latestByWallet = new Map<WalletType, RecommendedPortfolioWithHoldings>();
    for (const portfolio of portfolios) {
      if (!latestByWallet.has(portfolio.walletType)) {
        latestByWallet.set(portfolio.walletType, portfolio);
      }
    }

    return Array.from(latestByWallet.values());
  }
}
