import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RecommendedPortfoliosService } from './recommended-portfolios.service';

/**
 * Route prefix is `advisor/recommended-portfolios`, not
 * `recommended-portfolios` — matches the spec's API Contract
 * (`POST /advisor/recommended-portfolios/upload`,
 * `GET /advisor/recommended-portfolios/latest`). The mismatch with the
 * module directory name is intentional: these endpoints sit on the advisor
 * surface the frontend talks to, while the code lives in its own module
 * because it owns its own models (spec.md, RECOMMENDED_PORTFOLIOS_SHARED_T-2).
 * Don't "fix" the prefix to match the folder.
 *
 * `AuthGuard` (CONVENTIONS.md -> "Auth") is applied once here, at the
 * controller class, rather than per-handler — every row this module writes
 * carries a `userId` that always comes from `req.user.id`, so guarding the
 * class means a handler added later is protected by default instead of
 * relying on someone remembering to decorate it individually.
 *
 * No endpoints are added here; each story's tasks add their own.
 */
@Controller('advisor/recommended-portfolios')
@UseGuards(AuthGuard)
export class RecommendedPortfoliosController {
  constructor(private readonly recommendedPortfoliosService: RecommendedPortfoliosService) {}
}
