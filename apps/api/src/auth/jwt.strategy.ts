import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy, StrategyOptionsWithoutRequest } from 'passport-jwt';

const ACCESS_TOKEN_COOKIE = 'access_token';

/**
 * Custom `passport-jwt` extractor: pulls the JWT from the `access_token`
 * httpOnly cookie (populated by `cookie-parser`, wired in `main.ts`) rather
 * than the `Authorization` header, per spec Behavior Notes. Exported
 * separately so it's unit-testable in isolation (see `jwt.strategy.spec.ts`)
 * without needing a real HTTP request or passport wiring.
 */
export function extractJwtFromCookie(req: Request): string | null {
  return req?.cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
}

interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * Registered as the `'jwt'` passport strategy; `AuthGuard` (`auth.guard.ts`)
 * activates it. `validate`'s return value becomes `req.user`, so every
 * guarded controller resolves the authenticated user id via `req.user.id`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: extractJwtFromCookie,
      secretOrKey: process.env.JWT_SECRET,
    } as StrategyOptionsWithoutRequest);
  }

  validate(payload: JwtPayload): { id: string; email: string } {
    return { id: payload.sub, email: payload.email };
  }
}
