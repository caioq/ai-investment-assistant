import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RecommendedPortfoliosService } from './recommended-portfolios.service';

/**
 * Route prefix is `advisor/recommended-portfolios`, deliberately not matching
 * this module's directory name: the spec's API Contract puts these endpoints
 * on the advisor surface the frontend talks to
 * (`POST /advisor/recommended-portfolios/upload`,
 * `GET /advisor/recommended-portfolios/latest`), while the code lives in its
 * own module because it owns its own models.
 *
 * `AuthGuard` (CONVENTIONS.md -> "Auth") is applied once here, at the
 * controller class, rather than per-handler — every row this module writes
 * carries a `userId` that always comes from `req.user.id` and never from the
 * request, so guarding the class means a handler added later is protected by
 * default instead of relying on someone remembering to decorate it.
 *
 * No endpoints yet (RECOMMENDED_PORTFOLIOS_SHARED_T-2 is wiring only); each
 * story's own tasks add theirs.
 */
@Controller('advisor/recommended-portfolios')
@UseGuards(AuthGuard)
export class RecommendedPortfoliosController {
  constructor(private readonly recommendedPortfoliosService: RecommendedPortfoliosService) {}
}
