import { Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

/**
 * Shared guard for every protected endpoint in every module (see
 * CONVENTIONS.md -> "Auth"). Activates the `'jwt'` strategy (`JwtStrategy`,
 * registered by `AuthModule`), which resolves the authenticated user from
 * the `access_token` httpOnly cookie and sets `req.user` to
 * `{ id, email }` — no endpoint outside `AuthModule` accepts a `userId`
 * from the client, it always comes from `req.user.id`.
 */
@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {}
