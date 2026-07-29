import type { Request } from 'express';
import { extractJwtFromCookie } from './jwt.strategy';

/**
 * Unit test for the cookie-extractor function in isolation, per
 * specs/auth/tasks/AUTH_US-3_T-1-jwt-strategy-guard.md's Test field.
 * The full middleware + guard wiring (cookie-parser actually populating
 * `req.cookies`) is proven end-to-end by AUTH_US-3_T-2's e2e test.
 */
describe('extractJwtFromCookie', () => {
  it('returns the access_token cookie value when present', () => {
    const req = { cookies: { access_token: 'xyz' } } as unknown as Request;

    expect(extractJwtFromCookie(req)).toBe('xyz');
  });

  it('returns null when the access_token cookie is absent', () => {
    const req = { cookies: {} } as unknown as Request;

    expect(extractJwtFromCookie(req)).toBeNull();
  });

  it('returns null when req.cookies itself is undefined', () => {
    const req = {} as unknown as Request;

    expect(extractJwtFromCookie(req)).toBeNull();
  });
});
