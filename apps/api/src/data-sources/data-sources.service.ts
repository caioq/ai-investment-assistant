import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportLog, ImportSource, Prisma, WalletType } from '../../generated/prisma/client';
import { MarketDataService } from '../market-data/market-data.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { RecommendedPortfoliosService } from '../recommended-portfolios/recommended-portfolios.service';
import { AdvisorService } from '../advisor/advisor.service';
import { CreateImportLogDto } from './dto/create-import-log.dto';
import { DEFAULT_IMPORT_LOG_LIMIT } from './dto/list-imports-query.dto';

/** `GET /data-sources/summary`'s response shape, exactly as spec.md -> API Contract declares it. */
export interface DataSourcesSummary {
  assets: { count: number; tickers: string[]; lastImportAt: string | null };
  holdings: { count: number; lastImportAt: string | null };
  wallets: {
    walletType: WalletType;
    effectiveDate: string;
    sourceName: string | null;
    positions: number;
  }[];
  report: {
    id: string;
    title: string | null;
    publisher: string | null;
    publishedAt: string | null;
    fileName: string | null;
    uploadedAt: string;
  } | null;
}

/**
 * Import history for the data-sources page (spec.md -> Data Model / API
 * Contract). Every query is scoped to the `userId` the controller took from
 * `req.user.id` — the client never sends one (CONVENTIONS.md -> "Auth").
 */
@Injectable()
export class DataSourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
    private readonly portfolioService: PortfolioService,
    private readonly recommendedPortfoliosService: RecommendedPortfoliosService,
    private readonly advisorService: AdvisorService,
  ) {}

  /** The user's own import logs, newest first. */
  async listImports(userId: string, limit = DEFAULT_IMPORT_LOG_LIMIT): Promise<ImportLog[]> {
    return this.prisma.importLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async createImport(userId: string, dto: CreateImportLogDto): Promise<ImportLog> {
    return this.prisma.importLog.create({
      data: {
        userId,
        source: dto.source,
        // Only meaningful for a WALLET import; `undefined` (not `null`) so
        // Prisma leaves the nullable column at its default for the rest.
        walletType: dto.walletType,
        fileName: dto.fileName,
        records: dto.records,
        status: dto.status,
        message: dto.message,
        // `errors` is a `Json?` column holding `string[]`; an absent array
        // stays SQL NULL rather than becoming an empty array, so "no
        // rejected rows" and "errors not recorded" don't collapse into one.
        errors: dto.errors === undefined ? Prisma.DbNull : dto.errors,
      },
    });
  }

  /**
   * `GET /data-sources/summary` (DATA_SOURCES_SHARED_T-5, spec.md -> API
   * Contract) — everything the four source cards and the preview need in
   * one call. Composes `MarketDataService`/`PortfolioService`/
   * `RecommendedPortfoliosService`/`AdvisorService` rather than querying
   * their tables directly, per spec.md's API Contract note and this
   * module's own "Module boundary" precedent (`market-data`'s spec.md).
   *
   * `assets` is the one section not scoped to `userId` — `Asset` rows are
   * global (spec.md -> "Data ownership"), so its `lastImportAt` also reads
   * the newest `ImportLog` for `ASSETS` across every user, not just the
   * caller: an assets import changes what every user sees, so "when was
   * this last imported" is a global fact, consistent with `count`/
   * `tickers` above it. `holdings`/`wallets`/`report` are per-user, matching
   * every other per-user row this module already scopes by `req.user.id`.
   */
  async getSummary(userId: string): Promise<DataSourcesSummary> {
    const [assetsSummary, holdings, wallets, report, assetsLastImportAt, holdingsLastImportAt] =
      await Promise.all([
        this.marketDataService.getAssetsSummary(),
        this.portfolioService.listHoldings(userId),
        this.recommendedPortfoliosService.getLatestPerWallet(userId),
        this.advisorService.getLatestReport(userId),
        this.latestImportAt({ source: 'ASSETS' }),
        this.latestImportAt({ userId, source: 'HOLDINGS' }),
      ]);

    return {
      assets: {
        count: assetsSummary.count,
        tickers: assetsSummary.tickers,
        lastImportAt: assetsLastImportAt,
      },
      holdings: {
        count: holdings.length,
        lastImportAt: holdingsLastImportAt,
      },
      wallets: wallets.map((wallet) => ({
        walletType: wallet.walletType,
        effectiveDate: wallet.effectiveDate.toISOString(),
        sourceName: wallet.sourceName,
        positions: wallet.holdings.length,
      })),
      report: report
        ? {
            id: report.id,
            // Null for a report uploaded before the metadata columns existed
            // (or by an API caller that didn't send them).
            title: report.title,
            publisher: report.publisher,
            publishedAt: report.publishedAt ? report.publishedAt.toISOString() : null,
            fileName: report.fileName,
            uploadedAt: report.uploadedAt.toISOString(),
          }
        : null,
    };
  }

  /**
   * Newest `ImportLog.createdAt` matching `where`, as an ISO string, or
   * `null` when nothing has been imported yet. `Asset`/`Holding` carry no
   * timestamp of their own — `ImportLog` is the only record of "when",
   * hence this module owning the query directly rather than another
   * service (spec.md -> Data Model doc comment on `ImportLog`).
   */
  private async latestImportAt(where: {
    userId?: string;
    source: ImportSource;
  }): Promise<string | null> {
    const latest = await this.prisma.importLog.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return latest ? latest.createdAt.toISOString() : null;
  }
}
