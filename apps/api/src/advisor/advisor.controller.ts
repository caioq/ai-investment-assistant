import { Controller, Get, NotImplementedException, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AdvisorService } from './advisor.service';
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
 * Route shapes below match spec.md -> API Contract, but their bodies are
 * intentionally unimplemented stubs — this task (ADVISOR_SHARED_T-2) only
 * wires the module and the guard; each story's own task fills in real
 * request handling (DTOs, file upload, etc.) per method.
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
   * Implemented by ADVISOR_US-2_T-4. `AdvisorService.analyze` itself is now
   * implemented (ADVISOR_US-2_T-3) and takes `(userId, advisorReportId?)`,
   * but wiring `req.user.id` and a request DTO through to it is this route's
   * own task — deliberately left unimplemented here rather than guessed at,
   * per that task's scope.
   */
  @Post('analyze')
  async analyze(): Promise<AdvisorAnalysis> {
    throw new NotImplementedException('AdvisorController.analyze is implemented by ADVISOR_US-2_T-4');
  }

  /** Implemented by ADVISOR_US-3_T-1. */
  @Get('analysis/latest')
  async getLatestAnalysis(): Promise<AdvisorAnalysis> {
    return this.advisorService.getLatestAnalysis();
  }
}
