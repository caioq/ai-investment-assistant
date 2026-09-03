import { BadRequestException, Injectable, NotImplementedException } from '@nestjs/common';
// `pdf-parse` ships no type declarations of its own; `@types/pdf-parse`
// (dev dep) covers it.
import * as pdfParse from 'pdf-parse';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { RecommendedPortfoliosService } from '../recommended-portfolios/recommended-portfolios.service';
import { AdvisorAnalysis, AdvisorReport } from '../../generated/prisma/client';

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

  /**
   * `POST /advisor/reports/upload` accepts *either* a multipart PDF *or* a
   * JSON `{ sourceName?, text }` body (spec.md -> API Contract). Routing
   * between the two: a `file` present takes precedence and is run through
   * `extractPdfText` above, with `fileName` set from `file.originalname`;
   * otherwise a non-empty `text` is required and stored verbatim with
   * `fileName: null`. Neither present is a `BadRequestException` — not a
   * report row with an empty `rawText`, which would silently corrupt any
   * later `POST /advisor/analyze` prompt built from it.
   */
  async uploadReport(
    userId: string,
    input: { file?: Express.Multer.File; sourceName?: string; text?: string },
  ): Promise<AdvisorReport> {
    if (input.file) {
      const rawText = await this.extractPdfText(input.file.buffer);

      return this.prisma.advisorReport.create({
        data: {
          userId,
          sourceName: input.sourceName ?? null,
          fileName: input.file.originalname,
          rawText,
        },
      });
    }

    if (input.text && input.text.trim().length > 0) {
      return this.prisma.advisorReport.create({
        data: {
          userId,
          sourceName: input.sourceName ?? null,
          fileName: null,
          rawText: input.text,
        },
      });
    }

    throw new BadRequestException('Either a PDF file or non-empty text is required');
  }

  /**
   * Pure buffer -> string PDF text extraction, with no Prisma/HTTP concerns
   * (per ADVISOR_US-1_T-1) so the failure cases below are unit-testable
   * without multipart machinery. Persisting the result is
   * `ADVISOR_US-1_T-2`'s job (`POST /advisor/reports/upload`).
   *
   * Per spec.md's AC, a corrupt/invalid upload must be a clear 4xx, never a
   * 500 and never a silently empty `rawText` — so both a `pdf-parse`
   * failure and a parse that yields only whitespace (e.g. a scanned
   * image-only PDF) throw `BadRequestException` rather than propagating a
   * generic `Error` or returning unusable text.
   */
  async extractPdfText(buffer: Buffer): Promise<string> {
    let text: string;
    try {
      text = (await pdfParse(buffer)).text;
    } catch {
      throw new BadRequestException('Could not parse the uploaded file as a PDF');
    }

    if (text.trim().length === 0) {
      throw new BadRequestException('The PDF contains no extractable text');
    }

    return text;
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
