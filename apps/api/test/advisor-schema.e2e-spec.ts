import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * ADVISOR_SHARED_T-1 — `AdvisorReport` + `AdvisorAnalysis` schema.
 *
 * Plain `PrismaModule`-only e2e (per CONVENTIONS.md -> "Testing", same
 * pattern as `prisma.e2e-spec.ts`/`risk-rating-order.e2e-spec.ts`) since this
 * task is schema-only — there's no controller/service yet for either model,
 * just the Prisma models and their migration.
 */

// Namespaced to this suite (per CONVENTIONS.md -> "Testing" — e2e suites run
// in parallel against one test Postgres, and reusing another suite's email
// makes the two suites delete each other's rows).
const SUITE_EMAILS = [
  'advisor-schema-e2e-report@example.com',
  'advisor-schema-e2e-null-report@example.com',
  'advisor-schema-e2e-latest@example.com',
];

describe('AdvisorReport + AdvisorAnalysis schema (e2e)', () => {
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  afterEach(async () => {
    await prisma.advisorAnalysis.deleteMany({
      where: { user: { email: { in: SUITE_EMAILS } } },
    });
    await prisma.advisorReport.deleteMany({
      where: { user: { email: { in: SUITE_EMAILS } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: SUITE_EMAILS } } });
  });

  it('round-trips an AdvisorReport + linked AdvisorAnalysis, with Json fields read back as arrays', async () => {
    const user = await prisma.user.create({
      data: { email: SUITE_EMAILS[0], passwordHash: 'not-a-real-hash' },
    });

    const report = await prisma.advisorReport.create({
      data: {
        userId: user.id,
        sourceName: 'XP',
        fileName: 'report.pdf',
        rawText: 'The research house is bullish on small caps this quarter.',
      },
    });

    expect(report.rawText).toBe(
      'The research house is bullish on small caps this quarter.',
    );

    const analysis = await prisma.advisorAnalysis.create({
      data: {
        userId: user.id,
        advisorReportId: report.id,
        recommendedPortfolioIds: ['portfolio-1', 'portfolio-2'],
        score: 7.5,
        summary: 'Solid diversification with a few concentration risks.',
        strengths: ['Diversified across sectors'],
        risks: ['Overweight in one ticker'],
        recommendations: ['Trim the largest position'],
        impactMetrics: [{ label: 'Concentration', value: '35%' }],
        model: 'claude-sonnet-5',
      },
    });

    const readBackReport = await prisma.advisorReport.findUniqueOrThrow({
      where: { id: report.id },
    });
    const readBackAnalysis = await prisma.advisorAnalysis.findUniqueOrThrow({
      where: { id: analysis.id },
    });

    expect(readBackAnalysis.advisorReportId).toBe(report.id);
    expect(Array.isArray(readBackAnalysis.recommendedPortfolioIds)).toBe(true);
    expect(readBackAnalysis.recommendedPortfolioIds).toEqual([
      'portfolio-1',
      'portfolio-2',
    ]);
    expect(Array.isArray(readBackAnalysis.strengths)).toBe(true);
    expect(readBackAnalysis.strengths).toEqual(['Diversified across sectors']);
    expect(Array.isArray(readBackAnalysis.risks)).toBe(true);
    expect(readBackAnalysis.risks).toEqual(['Overweight in one ticker']);
    expect(Array.isArray(readBackAnalysis.recommendations)).toBe(true);
    expect(readBackAnalysis.recommendations).toEqual([
      'Trim the largest position',
    ]);
    expect(Array.isArray(readBackAnalysis.impactMetrics)).toBe(true);
    expect(readBackAnalysis.impactMetrics).toEqual([
      { label: 'Concentration', value: '35%' },
    ]);
    expect(readBackReport.rawText).toBe(report.rawText);
  });

  it('persists an AdvisorAnalysis with advisorReportId: null (no report is a first-class case)', async () => {
    const user = await prisma.user.create({
      data: { email: SUITE_EMAILS[1], passwordHash: 'not-a-real-hash' },
    });

    const analysis = await prisma.advisorAnalysis.create({
      data: {
        userId: user.id,
        advisorReportId: null,
        recommendedPortfolioIds: [],
        score: 5,
        summary: 'Analysis generated without a report.',
        strengths: [],
        risks: [],
        recommendations: [],
        impactMetrics: [],
        model: 'claude-sonnet-5',
      },
    });

    expect(analysis.advisorReportId).toBeNull();

    const readBack = await prisma.advisorAnalysis.findUniqueOrThrow({
      where: { id: analysis.id },
    });
    expect(readBack.advisorReportId).toBeNull();
  });

  it('findFirst ordered by createdAt desc returns the most recent of two AdvisorAnalysis rows', async () => {
    const user = await prisma.user.create({
      data: { email: SUITE_EMAILS[2], passwordHash: 'not-a-real-hash' },
    });

    const older = await prisma.advisorAnalysis.create({
      data: {
        userId: user.id,
        advisorReportId: null,
        recommendedPortfolioIds: [],
        score: 4,
        summary: 'Older analysis.',
        strengths: [],
        risks: [],
        recommendations: [],
        impactMetrics: [],
        model: 'claude-sonnet-5',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    });

    const newer = await prisma.advisorAnalysis.create({
      data: {
        userId: user.id,
        advisorReportId: null,
        recommendedPortfolioIds: [],
        score: 8,
        summary: 'Newer analysis.',
        strengths: [],
        risks: [],
        recommendations: [],
        impactMetrics: [],
        model: 'claude-sonnet-5',
        createdAt: new Date('2026-02-01T00:00:00Z'),
      },
    });

    const latest = await prisma.advisorAnalysis.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    expect(latest?.id).toBe(newer.id);
    expect(latest?.id).not.toBe(older.id);
  });
});
