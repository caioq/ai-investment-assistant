import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Owns `RecommendedPortfolio`/`RecommendedHolding` (spec.md -> Data Model).
 * No endpoints exist yet — this task only wires up the module skeleton
 * (RECOMMENDED_PORTFOLIOS_SHARED_T-2); each story's own tasks add the
 * actual upload/read logic.
 */
@Injectable()
export class RecommendedPortfoliosService {
  constructor(private readonly prisma: PrismaService) {}
}
