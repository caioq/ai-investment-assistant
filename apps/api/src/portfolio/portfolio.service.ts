import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Business logic for the `portfolio` module lives here per CONVENTIONS.md ->
 * "Module structure" (controllers stay thin). No endpoints exist yet — this
 * task (PORTFOLIO_SHARED_T-2) only wires the module skeleton; each story's
 * own tasks add the methods their endpoints call.
 */
@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}
}
