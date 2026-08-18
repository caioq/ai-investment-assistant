import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Owns ingestion and lookup of the research house's model portfolios
 * (`RecommendedPortfolio` / `RecommendedHolding`). Skeleton only —
 * each story's tasks add their own behavior here
 * (RECOMMENDED_PORTFOLIOS_SHARED_T-2).
 */
@Injectable()
export class RecommendedPortfoliosService {
  constructor(private readonly prisma: PrismaService) {}
}
