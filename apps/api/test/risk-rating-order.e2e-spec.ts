import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * The S&P / Fitch long-term scale, best credit -> worst.
 *
 * This is asserted against `pg_enum` rather than the generated Prisma client
 * on purpose: Postgres sorts an enum column by the order its labels were
 * declared, so this is the order `ORDER BY risk_rating` actually uses. A
 * transcription slip today, or an `ALTER TYPE ... ADD VALUE` appended past
 * 'D' later, would silently mis-sort every risk-ordered query rather than
 * fail loudly — which is exactly why it gets a test.
 */
const EXPECTED_RISK_RATING_ORDER = [
  'AAA',
  'AA+',
  'AA',
  'AA-',
  'A+',
  'A',
  'A-',
  'BBB+',
  'BBB',
  'BBB-',
  // investment grade ends here; below is speculative / high-yield
  'BB+',
  'BB',
  'BB-',
  'B+',
  'B',
  'B-',
  'CCC+',
  'CCC',
  'CCC-',
  'CC',
  'C',
  'D',
];

describe('RiskRating enum ordering (e2e)', () => {
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

  it('declares the S&P/Fitch scale in risk order, so ORDER BY sorts safest-first', async () => {
    const rows = await prismaService.$queryRaw<{ enumlabel: string }[]>`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'RiskRating'
      ORDER BY e.enumsortorder
    `;

    expect(rows.map((row) => row.enumlabel)).toEqual(EXPECTED_RISK_RATING_ORDER);
  });
});
