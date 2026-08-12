import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PortfolioService } from './portfolio.service';

/**
 * `AuthGuard` (CONVENTIONS.md -> "Auth") is applied once here, at the
 * controller class, rather than per-handler — every endpoint this module
 * adds is scoped to `req.user.id` (spec.md -> API Contract preamble), so
 * guarding the class means a handler added later is protected by default
 * instead of relying on someone remembering to decorate it individually
 * (see PORTFOLIO_US-1_T-5, which exists to catch exactly that omission).
 *
 * No endpoints are added by this task (PORTFOLIO_SHARED_T-2) — each story's
 * own tasks add their own handlers here.
 */
@Controller('portfolio')
@UseGuards(AuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}
}
