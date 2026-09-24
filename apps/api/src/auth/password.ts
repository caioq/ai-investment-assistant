import * as bcrypt from 'bcrypt';

/**
 * Salt rounds for every stored password hash. Shared by `AuthService.register`
 * and the demo seed (`apps/api/prisma/seed/`) so the two can never disagree.
 */
export const BCRYPT_SALT_ROUNDS = 10;

/** Hashes a plaintext password with bcrypt at `BCRYPT_SALT_ROUNDS`. */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}
