import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: { user: { create: jest.Mock } };
  let jwtService: { sign: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        create: jest.fn(),
      },
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-jwt'),
    };

    authService = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('hashes the password with bcrypt before creating the user', async () => {
      const email = 'jane@example.com';
      const password = 'super-secret-password';
      const name = 'Jane Doe';

      prisma.user.create.mockImplementation(
        async ({ data }: { data: { email: string; passwordHash: string; name?: string } }) => ({
          id: 'user-1',
          email: data.email,
          passwordHash: data.passwordHash,
          name: data.name ?? null,
          createdAt: new Date(),
        }),
      );

      await authService.register(email, password, name);

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      const createArgs = prisma.user.create.mock.calls[0][0];

      expect(createArgs.data.email).toBe(email);
      expect(createArgs.data.name).toBe(name);
      expect(createArgs.data.passwordHash).not.toBe(password);
      await expect(bcrypt.compare(password, createArgs.data.passwordHash)).resolves.toBe(true);
    });

    it('throws ConflictException when Prisma rejects with a P2002 unique-constraint error on email', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed on the fields: (`email`)',
          {
            code: 'P2002',
            clientVersion: '7.9.1',
            meta: { target: ['email'] },
          },
        ),
      );

      await expect(authService.register('taken@example.com', 'password123')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
