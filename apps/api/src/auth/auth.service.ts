import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { Prisma, User } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const BCRYPT_SALT_ROUNDS = 10;

/** Prisma's error code for a unique-constraint violation. */
const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

const ACCESS_TOKEN_COOKIE = 'access_token';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Signs a JWT for `user` and sets it on the `access_token` httpOnly cookie
   * (spec Behavior Notes: `httpOnly: true`, `sameSite: 'lax'`, `secure: isProd`).
   * Shared by the register endpoint and (per AUTH_US-2_T-2) the login endpoint,
   * so the sign+set-cookie logic isn't duplicated between them.
   */
  issueSession(res: Response, user: User): void {
    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  async register(email: string, password: string, name?: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    try {
      return await this.prisma.user.create({
        data: { email, passwordHash, name },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException('A user with this email already exists');
      }

      throw error;
    }
  }
}
