import {
  BadGatewayException,
  Inject,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import type Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { RecommendedPortfoliosService } from '../recommended-portfolios/recommended-portfolios.service';
import { AllocationBy } from '../portfolio/dto/allocation-query.dto';
import { AdvisorAnalysis, AdvisorReport, Asset } from '../../generated/prisma/client';
import { ANTHROPIC_CLIENT, AnthropicClient } from './providers/anthropic-client.interface';

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
 * Model id sent to `messages.create` (ADVISOR_US-2_T-3, spec.md -> Behavior
 * Notes: "claude-sonnet-5 ... good cost/quality fit"). Also recorded
 * verbatim on the persisted `AdvisorAnalysis.model` — the spec calls this
 * an audit field, since it's the only way to explain why two analyses of
 * the same portfolio differ after a future model upgrade.
 */
const ANALYSIS_MODEL = 'claude-sonnet-5';

/**
 * Ceiling for the structured JSON response (score, summary, a handful of
 * strengths/risks/recommendations, a few impact metrics) — generous enough
 * that a normal analysis is never cut off mid-JSON (which would fail
 * `JSON.parse` and burn one of the two attempts below on a formatting
 * accident rather than a real schema mismatch), bounded so a single call's
 * cost stays predictable.
 */
const ANALYSIS_MAX_OUTPUT_TOKENS = 4096;

/**
 * Total attempts against `ANTHROPIC_CLIENT` per `analyze()` call: the first
 * try plus exactly one retry on a schema-invalid response (spec.md -> AC
 * "retried once, then surfaced as an error"). Never more — an unbounded
 * retry loop against a paid API is how one bad prompt turns into a real
 * bill.
 */
const MAX_ANALYSIS_ATTEMPTS = 2;

/**
 * JSON Schema passed as `output_config.format` (`claude-api` skill:
 * supersedes the older `output_format` param). Mirrors `AdvisorAnalysis`'s
 * own JSON columns 1:1 (spec.md -> Data Model), `required`/
 * `additionalProperties: false` on both the outer object and each
 * `impactMetrics` entry (spec.md -> Behavior Notes). `score` has no
 * `minimum`/`maximum` — JSON Schema structured output doesn't support
 * range constraints, so the prompt instructs the 0-10 range and
 * `clampScore` enforces it in code after the response comes back.
 */
const ANALYSIS_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    score: {
      type: 'number',
      description: 'Overall portfolio score, intended to be between 0 and 10 inclusive.',
    },
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    impactMetrics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['label', 'value'],
        additionalProperties: false,
      },
    },
  },
  required: ['score', 'summary', 'strengths', 'risks', 'recommendations', 'impactMetrics'],
  additionalProperties: false,
} as const;

/** Parsed + schema-validated shape of a `messages.create` response's JSON text, before `score` is clamped. */
interface AnalysisPayload {
  score: number;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  impactMetrics: { label: string; value: string }[];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isImpactMetricsArray(value: unknown): value is { label: string; value: string }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).label === 'string' &&
        typeof (item as Record<string, unknown>).value === 'string',
    )
  );
}

/**
 * Validates a parsed JSON value against `ANALYSIS_OUTPUT_SCHEMA`'s shape
 * before it's ever persisted (spec.md -> AC "validates against the
 * declared schema on every field before being persisted"). `output_config
 * .format` constrains the model's *generation*, but this app never trusts
 * an upstream response's shape without checking it independently — this is
 * also what makes the retry-once behavior below testable with a stub.
 */
function isAnalysisPayload(value: unknown): value is AnalysisPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.score === 'number' &&
    typeof candidate.summary === 'string' &&
    isStringArray(candidate.strengths) &&
    isStringArray(candidate.risks) &&
    isStringArray(candidate.recommendations) &&
    isImpactMetricsArray(candidate.impactMetrics)
  );
}

/** Clamps `score` to 0-10 in code (spec.md -> Behavior Notes; JSON Schema structured output has no `minimum`/`maximum`). */
function clampScore(score: number): number {
  return Math.min(10, Math.max(0, score));
}

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
 *
 * `ANTHROPIC_CLIENT` is injected here by `ADVISOR_US-2_T-1` so
 * `ADVISOR_US-2_T-3`'s `analyze()` can call `this.anthropicClient.messages
 * .create(...)` without depending on the concrete `Anthropic` SDK class —
 * see `providers/anthropic-client.interface.ts`.
 */
@Injectable()
export class AdvisorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolioService: PortfolioService,
    private readonly recommendedPortfoliosService: RecommendedPortfoliosService,
    @Inject(ANTHROPIC_CLIENT) private readonly anthropicClient: AnthropicClient,
  ) {}

  /** Implemented by ADVISOR_US-1_T-2 (`POST /advisor/reports/upload`). */
  async uploadReport(): Promise<AdvisorReport> {
    throw new NotImplementedException('AdvisorService.uploadReport is implemented by ADVISOR_US-1_T-2');
  }

  /**
   * Builds the three-block prompt from spec.md -> Behavior Notes, plus the
   * ids of the `RecommendedPortfolio` snapshots that went into it —
   * `analyze()` (ADVISOR_US-2_T-3) needs both, and computing them together
   * avoids a second `getLatestPerWallet` round-trip for what should be the
   * exact same wallets the prompt just read.
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
  private async gatherPromptContext(
    userId: string,
    advisorReportId?: string,
  ): Promise<{ prompt: string; recommendedPortfolioIds: string[] }> {
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

    return {
      prompt: sections.join('\n\n'),
      recommendedPortfolioIds: recommendedWallets.map((wallet) => wallet.id),
    };
  }

  /**
   * Unit-tested on its own (ADVISOR_US-2_T-2, `advisor.service.spec.ts`) —
   * a thin wrapper over `gatherPromptContext` that drops the provenance
   * ids `analyze()` needs but a prompt-only test doesn't.
   */
  async buildAnalysisPrompt(userId: string, advisorReportId?: string): Promise<string> {
    const { prompt } = await this.gatherPromptContext(userId, advisorReportId);
    return prompt;
  }

  /**
   * `(id, userId)`-scoped `AdvisorReport` lookup (ADVISOR_US-2_T-4), used by
   * `AdvisorController.analyze` to reject a cross-user `advisorReportId`
   * with `404` before ever calling `analyze()` below — same rule as
   * `PortfolioService.updateHolding`/`deleteHolding` (CONVENTIONS.md ->
   * "Auth"): `404`, never `403`, so the response can't be used to probe
   * which report ids exist for another user.
   */
  async getReportForUser(userId: string, id: string): Promise<AdvisorReport> {
    const report = await this.prisma.advisorReport.findFirst({ where: { id, userId } });
    if (!report) {
      throw new NotFoundException(`No AdvisorReport found for id '${id}'`);
    }
    return report;
  }

  /**
   * `POST /advisor/analyze`'s core logic (ADVISOR_US-2_T-3; wired to the
   * route itself by ADVISOR_US-2_T-4). Sends the prompt through
   * `ANTHROPIC_CLIENT` (ADVISOR_US-2_T-1) with output constrained by
   * `ANALYSIS_OUTPUT_SCHEMA`, validates the response independently
   * (`isAnalysisPayload`) before ever touching Prisma, retries exactly once
   * on a schema-invalid response and then throws rather than persisting a
   * malformed row (spec.md -> AC), clamps `score` to 0-10, and always
   * inserts a new `AdvisorAnalysis` row — never updates one. Caching is
   * `GET /advisor/analysis/latest` reading the newest row, which is US-3's
   * job, not this method's.
   */
  async analyze(userId: string, advisorReportId?: string): Promise<AdvisorAnalysis> {
    const { prompt, recommendedPortfolioIds } = await this.gatherPromptContext(userId, advisorReportId);

    let payload: AnalysisPayload | null = null;
    for (let attempt = 1; attempt <= MAX_ANALYSIS_ATTEMPTS; attempt++) {
      const message = await this.anthropicClient.messages.create({
        model: ANALYSIS_MODEL,
        max_tokens: ANALYSIS_MAX_OUTPUT_TOKENS,
        thinking: { type: 'disabled' },
        messages: [{ role: 'user', content: prompt }],
        output_config: { format: { type: 'json_schema', schema: ANALYSIS_OUTPUT_SCHEMA } },
      });

      const textBlock = message.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );
      let parsed: unknown;
      try {
        parsed = textBlock ? JSON.parse(textBlock.text) : undefined;
      } catch {
        parsed = undefined;
      }

      if (isAnalysisPayload(parsed)) {
        payload = parsed;
        break;
      }
    }

    if (!payload) {
      throw new BadGatewayException(
        'Claude returned a schema-invalid portfolio analysis twice in a row; not persisting a malformed row.',
      );
    }

    return this.prisma.advisorAnalysis.create({
      data: {
        userId,
        advisorReportId: advisorReportId ?? null,
        recommendedPortfolioIds,
        score: clampScore(payload.score),
        summary: payload.summary,
        strengths: payload.strengths,
        risks: payload.risks,
        recommendations: payload.recommendations,
        impactMetrics: payload.impactMetrics,
        model: ANALYSIS_MODEL,
      },
    });
  }

  /** Implemented by ADVISOR_US-3_T-1 (`GET /advisor/analysis/latest`). */
  async getLatestAnalysis(): Promise<AdvisorAnalysis> {
    throw new NotImplementedException(
      'AdvisorService.getLatestAnalysis is implemented by ADVISOR_US-3_T-1',
    );
  }
}
