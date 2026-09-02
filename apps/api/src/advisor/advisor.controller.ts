import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AdvisorService } from './advisor.service';
import { AnalyzeDto } from './dto/analyze.dto';
import { AdvisorAnalysis, AdvisorReport } from '../../generated/prisma/client';

/**
 * `AuthGuard` (CONVENTIONS.md -> "Auth") is applied once here, at the
 * controller class, rather than per-handler — every route this module adds
 * is per-user and `POST /advisor/analyze` spends money on a paid API call,
 * so guarding the class means a handler added later is protected by
 * default instead of relying on someone remembering to decorate it
 * individually (same rationale as `PortfolioController`/
 * `RecommendedPortfoliosController`).
 *
 * Route shapes below match spec.md -> API Contract. `uploadReport`/
 * `getLatestAnalysis` are still intentionally unimplemented stubs — this
 * module was wired by ADVISOR_SHARED_T-2, with each story's own task
 * filling in real request handling (DTOs, file upload, etc.) per method;
 * `analyze` was filled in by ADVISOR_US-2_T-4.
 */
@Controller('advisor')
@UseGuards(AuthGuard)
export class AdvisorController {
  constructor(private readonly advisorService: AdvisorService) {}

  /** Implemented by ADVISOR_US-1_T-2. */
  @Post('reports/upload')
  async uploadReport(): Promise<AdvisorReport> {
    return this.advisorService.uploadReport();
  }

  /**
   * `AdvisorService.analyze` (ADVISOR_US-2_T-3) takes `(userId,
   * advisorReportId?)` and doesn't itself check that `advisorReportId`
   * belongs to `userId` — its own `gatherPromptContext` scopes its *report
   * text* lookup to `userId`, but silently falls back to "no report" for an
   * id that exists yet belongs to someone else, and still persists that raw
   * id on the resulting row. Rejecting a cross-user `advisorReportId`
   * before ever calling `analyze()` is this task's own scope (spec.md ->
   * task description): it's the one place in this module where a
   * cross-user leak could hand someone else's research report id onto this
   * user's `AdvisorAnalysis` row. `AdvisorService.getReportForUser` does
   * the `(id, userId)`-scoped lookup and throws `NotFoundException` (same
   * `404`-not-`403` rule as `PortfolioService.updateHolding`/`deleteHolding`,
   * CONVENTIONS.md -> "Auth") — checked here, before `analyze()`, so a bad
   * id never reaches the paid Claude call or creates a row.
   *
   * `@HttpCode(200)`: this creates a new `AdvisorAnalysis` row, but the
   * spec's task test expects `200` (not Nest's default `201` for `@Post`)
   * — same override `AuthController.login` already uses for a `POST` that
   * doesn't read as "created" in the REST sense a client would expect.
   */
  @Post('analyze')
  @HttpCode(200)
  async analyze(@Req() req: Request, @Body() dto: AnalyzeDto): Promise<AdvisorAnalysis> {
    const userId = (req.user as { id: string }).id;

    if (dto.advisorReportId) {
      await this.advisorService.getReportForUser(userId, dto.advisorReportId);
    }

    return this.advisorService.analyze(userId, dto.advisorReportId);
  }

  /** Implemented by ADVISOR_US-3_T-1. */
  @Get('analysis/latest')
  async getLatestAnalysis(): Promise<AdvisorAnalysis> {
    return this.advisorService.getLatestAnalysis();
  }
}
