import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Routes are added incrementally by later tasks (see
 * specs/auth/tasks/AUTH_US-1_T-3-register-endpoint.md and onward) —
 * this task only scaffolds the module structure and `AuthService.register`.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
