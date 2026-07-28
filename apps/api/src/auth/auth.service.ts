import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** `User` without `passwordHash` — never return the hash in an API response. */
type SafeUser = Omit<User, 'passwordHash'>;

const BCRYPT_SALT_ROUNDS = 10;

/** Prisma's error code for a unique-constraint violation. */
const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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

  async validateUser(email: string, password: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Same error whether the email isn't found or the password doesn't
    // match, so callers can't use response differences to enumerate emails.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
