import { Injectable, NotImplementedException } from '@nestjs/common';
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

  /** Implemented by ADVISOR_US-1_T-2 (`POST /advisor/reports/upload`). */
  async uploadReport(): Promise<AdvisorReport> {
    throw new NotImplementedException('AdvisorService.uploadReport is implemented by ADVISOR_US-1_T-2');
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
