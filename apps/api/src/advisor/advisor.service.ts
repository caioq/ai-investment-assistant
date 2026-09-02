import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { RecommendedPortfoliosService } from '../recommended-portfolios/recommended-portfolios.service';
import { AllocationBy } from '../portfolio/dto/allocation-query.dto';
import { AdvisorAnalysis, AdvisorReport, Asset } from '../../generated/prisma/client';

/**
 * `AdvisorReport.rawText` character budget for the prompt's Block 2
 * (ADVISOR_US-2_T-2, spec.md -> Behavior Notes: "truncated to ~15k chars").
 * A character budget, not a token estimate — simple, deterministic, and
 * cheap to test.
 */
const REPORT_CHAR_BUDGET = 15_000;

/**
 * The allocation axes the prompt's Block 1 includes (spec.md -> Behavior
 * Notes: "allocation by sector/stock/style/rating"). Deliberately narrower
 * than `ALLOCATION_BY_VALUES` (which also has `subsector`, used by
 * `GET /portfolio/allocation?by=` but not called out in the advisor prompt).
 */
const PROMPT_ALLOCATION_AXES: AllocationBy[] = ['sector', 'stock', 'investmentStyle', 'riskRating'];

/**
 * `Asset`'s four optional classification fields, keyed the same way
 * everywhere they're read from (`sector`/`subSector`/`investmentStyle`/
 * `riskRating`) — every one of them is `null` for a ticker not yet covered
 * by an assets CSV import (spec.md -> Behavior Notes).
 */
type ClassificationFields = Pick<Asset, 'sector' | 'subSector' | 'investmentStyle' | 'riskRating'>;

/**
 * Drops any key whose value is `null`/`undefined` rather than keeping it as
 * an explicit JSON `null`. This is what keeps the prompt free of the
 * literal strings `"undefined"`/`"null"` for an unclassified asset (spec
 * AC "contains no undefined/"null" string artifacts") — `JSON.stringify`
 * only omits a key for an actual `undefined` value, not for `null`, so a
 * `{ sector: null }` object would otherwise render `"sector":null` verbatim.
 */
function omitNullish<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    const value = obj[key];
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/** The four optional classification fields, present only when non-null. */
function classificationFields(asset: ClassificationFields | null | undefined): Partial<ClassificationFields> {
  return omitNullish({
    sector: asset?.sector ?? null,
    subSector: asset?.subSector ?? null,
    investmentStyle: asset?.investmentStyle ?? null,
    riskRating: asset?.riskRating ?? null,
  });
}

/**
 * Thin-controller/logic-in-service split per CONVENTIONS.md -> "Module
 * structure". `PortfolioService` and `RecommendedPortfoliosService` are
 * injected here (via `PortfolioModule`/`RecommendedPortfoliosModule`'s
 * exports, imported by `AdvisorModule`) because `ADVISOR_US-2_T-2`'s prompt
 * builder needs both to gather the user's holdings/allocation and the
 * latest recommended portfolios — see spec.md -> Behavior Notes. This task
 * (ADVISOR_SHARED_T-2) only wires the module and its `AuthGuard`; the
 * methods below are deliberately unimplemented stubs so each story's own
 * task (noted per method) can fill in the real behavior without this task
 * reaching into their scope.
 */
@Injectable()
export class AdvisorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolioService: PortfolioService,
    private readonly recommendedPortfoliosService: RecommendedPortfoliosService,
  ) {}

  /** Implemented by ADVISOR_US-1_T-2 (`POST /advisor/reports/upload`). */
  async uploadReport(): Promise<AdvisorReport> {
    throw new NotImplementedException('AdvisorService.uploadReport is implemented by ADVISOR_US-1_T-2');
  }

  /**
   * Builds the three-block prompt from spec.md -> Behavior Notes, separable
   * from the actual Claude API call (ADVISOR_US-2_T-3 calls this and passes
   * the result along) so it's unit-testable on its own (ADVISOR_US-2_T-2).
   *
   * - Block 1 (the user's portfolio) and its allocation/summary/performance
   *   come from `PortfolioService` — never a direct `holdings`/`assets`
   *   query here (spec.md -> Behavior Notes' one-way module boundary).
   * - Block 2 (the report) is read directly from `AdvisorReport` — this
   *   module owns that model — only when `advisorReportId` is passed and
   *   resolves to a report belonging to `userId`; omitted entirely
   *   otherwise, never as an empty heading.
   * - Block 3 (recommended wallets) comes from
   *   `RecommendedPortfoliosService.getLatestPerWallet`, whose `holdings`
   *   are joined with `asset` (widened by this same task) so a recommended
   *   ticker's classification and `currentPrice` are available even for a
   *   ticker the user doesn't hold.
   */
  async buildAnalysisPrompt(userId: string, advisorReportId?: string): Promise<string> {
    const [holdings, allocationEntries, summary, performance, recommendedWallets] = await Promise.all([
      this.portfolioService.listHoldings(userId),
      Promise.all(
        PROMPT_ALLOCATION_AXES.map(
          async (by) => [by, await this.portfolioService.getAllocation(userId, by)] as const,
        ),
      ),
      this.portfolioService.getSummary(userId),
      this.portfolioService.getPerformance(userId),
      this.recommendedPortfoliosService.getLatestPerWallet(userId),
    ]);

    const portfolioBlock = {
      holdings: holdings.map((holding) => ({
        ticker: holding.asset.ticker,
        quantity: holding.quantity,
        avgPrice: holding.avgPrice,
        currentPrice: holding.asset.currentPrice ?? holding.avgPrice,
        currentValue: holding.quantity * (holding.asset.currentPrice ?? holding.avgPrice),
        ...classificationFields(holding.asset),
      })),
      allocation: Object.fromEntries(allocationEntries),
      summary,
      performance,
    };

    let reportSection: string | null = null;
    if (advisorReportId) {
      const report = await this.prisma.advisorReport.findFirst({
        where: { id: advisorReportId, userId },
      });
      if (report) {
        const isTruncated = report.rawText.length > REPORT_CHAR_BUDGET;
        const text = isTruncated ? report.rawText.slice(0, REPORT_CHAR_BUDGET) : report.rawText;
        reportSection = isTruncated
          ? `${text}\n\n[Note: the text above was truncated to ${REPORT_CHAR_BUDGET} characters and may end mid-sentence; it is an excerpt, not necessarily the report's full conclusion.]`
          : text;
      }
    }

    const recommendedWalletsBlock = recommendedWallets.map((wallet) => ({
      walletType: wallet.walletType,
      effectiveDate: wallet.effectiveDate,
      holdings: wallet.holdings.map((holding) =>
        omitNullish({
          ticker: holding.asset?.ticker ?? null,
          label: holding.label,
          targetWeightPct: holding.targetWeightPct,
          limitPrice: holding.limitPrice,
          ...classificationFields(holding.asset),
        }),
      ),
    }));

    const sections = [
      'You are an investment analyst reviewing a retail investor\'s B3 stock portfolio. ' +
        'Produce a structured analysis (score, summary, strengths, risks, recommendations, impact metrics). ' +
        '`score` must be a number between 0 and 10 inclusive. ' +
        'Any classification field (sector, subSector, investmentStyle, riskRating) that is absent from a holding ' +
        'means that ticker has not been classified yet — treat it as unknown, not as a signal.',
      `## Portfolio\n${JSON.stringify(portfolioBlock, null, 2)}`,
    ];

    if (reportSection !== null) {
      sections.push(`## Research House Report\n${reportSection}`);
    }

    sections.push(`## Recommended Portfolios\n${JSON.stringify(recommendedWalletsBlock, null, 2)}`);

    return sections.join('\n\n');
  }

  /** Implemented by ADVISOR_US-2_T-4 (`POST /advisor/analyze`). */
  async analyze(): Promise<AdvisorAnalysis> {
    throw new NotImplementedException('AdvisorService.analyze is implemented by ADVISOR_US-2_T-4');
  }

  /** Implemented by ADVISOR_US-3_T-1 (`GET /advisor/analysis/latest`). */
  async getLatestAnalysis(): Promise<AdvisorAnalysis> {
    throw new NotImplementedException(
      'AdvisorService.getLatestAnalysis is implemented by ADVISOR_US-3_T-1',
    );
  }
}
