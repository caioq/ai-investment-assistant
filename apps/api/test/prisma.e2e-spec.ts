import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PrismaModule (e2e)', () => {
  let moduleFixture: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    prismaService = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  it('connects to the db-test Postgres service and can run a raw query', async () => {
    const result = await prismaService.$queryRaw`SELECT 1`;

    expect(result).toBeDefined();
  });
});
