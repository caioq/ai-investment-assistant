import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import type Anthropic from '@anthropic-ai/sdk';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AdvisorService } from '../src/advisor/advisor.service';
import { ANTHROPIC_CLIENT, AnthropicClient } from '../src/advisor/providers/anthropic-client.interface';
import { PrismaService } from '../src/prisma/prisma.service';
import { WalletType } from '../generated/prisma/client';

/**
 * Proves `AuthGuard` (CONVENTIONS.md -> "Auth") is actually mounted on
 * `AdvisorController` (ADVISOR_SHARED_T-2) — an unauthenticated request to
 * one of its routes must be rejected with `401` rather than falling through
 * to a `404` (which would mean the route, not the guard, is the reason the
 * request failed). Business logic for these routes belongs to their own
 * story tasks (ADVISOR_US-1_T-2, ADVISOR_US-2_T-4, ADVISOR_US-3_T-1); this
 * suite only asserts wiring.
 */
describe('AdvisorController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when no auth cookie is sent to GET /advisor/analysis/latest', async () => {
    const response = await request(app.getHttpServer()).get('/advisor/analysis/latest');

    expect(response.status).toBe(401);
  });
});

/**
 * ADVISOR_US-2_T-3 — `AdvisorService.analyze`. Calls the service method
 * directly (`moduleFixture.get(AdvisorService)`) rather than through HTTP:
 * `POST /advisor/analyze` itself is ADVISOR_US-2_T-4's job, this task only
 * covers the service-layer call/validate/persist behavior. `ANTHROPIC_CLIENT`
 * is stubbed via `.overrideProvider` on the full `AppModule` graph
 * (CONVENTIONS.md -> "Testing"), so no test here ever reaches the real
 * Claude API.
 */
describe('AdvisorService.analyze (e2e)', () => {
  let moduleFixture: TestingModule;
  let advisorService: AdvisorService;
  let prisma: PrismaService;
  let userId: string;

  const SUITE_EMAIL = 'advisor-analyze-e2e@example.com';
  const SUITE_TICKER = 'ADVA4';

  const createStub: jest.Mock = jest.fn();
  const anthropicClientStub: AnthropicClient = { messages: { create: createStub } };

  const VALID_PAYLOAD = {
    score: 7,
    summary: 'A reasonably diversified portfolio with a few concentration risks.',
    strengths: ['Diversified across sectors'],
    risks: ['Overweight in one ticker'],
    recommendations: ['Trim the largest position'],
    impactMetrics: [{ label: 'Concentration', value: '35%' }],
  };

  /** Minimal `Anthropic.Message` double — only `content` is read by `AdvisorService.analyze`. */
  function stubMessage(body: unknown): Anthropic.Message {
    return {
      content: [{ type: 'text', text: JSON.stringify(body), citations: [] }],
    } as unknown as Anthropic.Message;
  }

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ANTHROPIC_CLIENT)
      .useValue(anthropicClientStub)
      .compile();

    advisorService = moduleFixture.get(AdvisorService);
    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  beforeEach(async () => {
    createStub.mockReset();
    const user = await prisma.user.create({
      data: { email: SUITE_EMAIL, passwordHash: 'not-a-real-hash' },
    });
    userId = user.id;
  });

  // Scoped cleanup per CONVENTIONS.md -> "Testing" — never an unscoped
  // deleteMany() against a table other suites touch concurrently.
  afterEach(async () => {
    await prisma.advisorAnalysis.deleteMany({ where: { userId } });
    await prisma.recommendedPortfolio.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: SUITE_EMAIL } });
    await prisma.asset.deleteMany({ where: { ticker: SUITE_TICKER } });
  });

  it('(1) persists an AdvisorAnalysis whose Json arrays round-trip and whose model records the model id used', async () => {
    createStub.mockResolvedValueOnce(stubMessage(VALID_PAYLOAD));

    const analysis = await advisorService.analyze(userId);

    expect(analysis.model).toBe('claude-sonnet-5');
    expect(analysis.score).toBe(7);
    expect(analysis.summary).toBe(VALID_PAYLOAD.summary);

    const readBack = await prisma.advisorAnalysis.findUniqueOrThrow({ where: { id: analysis.id } });
    expect(readBack.strengths).toEqual(VALID_PAYLOAD.strengths);
    expect(readBack.risks).toEqual(VALID_PAYLOAD.risks);
    expect(readBack.recommendations).toEqual(VALID_PAYLOAD.recommendations);
    expect(readBack.impactMetrics).toEqual(VALID_PAYLOAD.impactMetrics);
  });

  it('(2) clamps an out-of-range score to 0-10 before persisting', async () => {
    createStub.mockResolvedValueOnce(stubMessage({ ...VALID_PAYLOAD, score: 12 }));
    const tooHigh = await advisorService.analyze(userId);
    expect(tooHigh.score).toBe(10);

    createStub.mockResolvedValueOnce(stubMessage({ ...VALID_PAYLOAD, score: -3 }));
    const tooLow = await advisorService.analyze(userId);
    expect(tooLow.score).toBe(0);
  });

  it('(3) retries exactly once on a schema-invalid response and persists the retry\'s valid payload', async () => {
    createStub
      .mockResolvedValueOnce(stubMessage({ score: 5 })) // missing every other required field
      .mockResolvedValueOnce(stubMessage(VALID_PAYLOAD));

    const analysis = await advisorService.analyze(userId);

    expect(createStub).toHaveBeenCalledTimes(2);
    expect(analysis.summary).toBe(VALID_PAYLOAD.summary);
  });

  it('(4) throws and persists no row when the response is schema-invalid twice, never calling a third time', async () => {
    createStub.mockResolvedValue(stubMessage({ score: 'not-a-number' }));

    await expect(advisorService.analyze(userId)).rejects.toThrow();

    expect(createStub).toHaveBeenCalledTimes(2);
    const rows = await prisma.advisorAnalysis.findMany({ where: { userId } });
    expect(rows).toHaveLength(0);
  });

  it('(5) succeeds and persists advisorReportId: null when no advisorReportId is passed', async () => {
    createStub.mockResolvedValueOnce(stubMessage(VALID_PAYLOAD));

    const analysis = await advisorService.analyze(userId);

    expect(analysis.advisorReportId).toBeNull();
  });

  it('(6) records the ids of the RecommendedPortfolio wallets that were in the prompt', async () => {
    const asset = await prisma.asset.create({ data: { ticker: SUITE_TICKER, name: 'Advisor Test Asset' } });
    const wallet = await prisma.recommendedPortfolio.create({
      data: {
        userId,
        walletType: WalletType.OVERALL_RECOMMENDED,
        effectiveDate: new Date('2026-01-01'),
        holdings: { create: [{ label: 'Advisor Test Asset', assetId: asset.id }] },
      },
    });
    createStub.mockResolvedValueOnce(stubMessage(VALID_PAYLOAD));

    const analysis = await advisorService.analyze(userId);

    expect(analysis.recommendedPortfolioIds).toEqual([wallet.id]);
  });
});

/**
 * ADVISOR_US-3_T-1 — `GET /advisor/analysis/latest`. Exercised through real
 * HTTP (unlike the `analyze` suite above, which calls the service directly)
 * since this task's whole point is the route + auth wiring, not just the
 * query. `ANTHROPIC_CLIENT` is stubbed the same way so case (4) below can
 * assert it is never called by this endpoint — the entire point of the
 * caching design (spec.md -> Behavior Notes: "This endpoint must never call
 * the Claude API").
 */
describe('GET /advisor/analysis/latest (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  const SUITE_EMAIL_A = 'advisor-latest-e2e-a@example.com';
  const SUITE_EMAIL_B = 'advisor-latest-e2e-b@example.com';

  const createStub: jest.Mock = jest.fn();
  const anthropicClientStub: AnthropicClient = { messages: { create: createStub } };

  const VALID_PAYLOAD = {
    score: 6,
    summary: 'Summary A',
    strengths: ['Strength A'],
    risks: ['Risk A'],
    recommendations: ['Recommendation A'],
    impactMetrics: [{ label: 'Metric', value: '10%' }],
  };

  function stubMessage(body: unknown): Anthropic.Message {
    return {
      content: [{ type: 'text', text: JSON.stringify(body), citations: [] }],
    } as unknown as Anthropic.Message;
  }

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ANTHROPIC_CLIENT)
      .useValue(anthropicClientStub)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    createStub.mockReset();
  });

  // Scoped cleanup per CONVENTIONS.md -> "Testing".
  afterEach(async () => {
    await prisma.advisorAnalysis.deleteMany({
      where: { user: { email: { in: [SUITE_EMAIL_A, SUITE_EMAIL_B] } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: [SUITE_EMAIL_A, SUITE_EMAIL_B] } } });
  });

  /** Registers + logs in a user, returning the `access_token` cookie array plus the new user's id. */
  async function registerAndLogin(email: string): Promise<{ cookies: string[]; userId: string }> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'super-secret-password' });

    const setCookieHeader = response.headers['set-cookie'];
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    return { cookies, userId: (response.body as { id: string }).id };
  }

  it('(2) returns 404 when the authed user has never generated an analysis', async () => {
    const { cookies } = await registerAndLogin(SUITE_EMAIL_A);

    const response = await request(app.getHttpServer())
      .get('/advisor/analysis/latest')
      .set('Cookie', cookies);

    expect(response.status).toBe(404);
  });

  it('(3) returns the newer of two analyses, seeded with distinct createdAt values', async () => {
    const { cookies, userId } = await registerAndLogin(SUITE_EMAIL_A);

    const older = await prisma.advisorAnalysis.create({
      data: {
        userId,
        recommendedPortfolioIds: [],
        score: 3,
        summary: 'Older analysis',
        strengths: [],
        risks: [],
        recommendations: [],
        impactMetrics: [],
        model: 'claude-sonnet-5',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    const newer = await prisma.advisorAnalysis.create({
      data: {
        userId,
        recommendedPortfolioIds: [],
        score: 8,
        summary: 'Newer analysis',
        strengths: [],
        risks: [],
        recommendations: [],
        impactMetrics: [],
        model: 'claude-sonnet-5',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
      },
    });

    const response = await request(app.getHttpServer())
      .get('/advisor/analysis/latest')
      .set('Cookie', cookies);

    expect(response.status).toBe(200);
    expect((response.body as { id: string }).id).toBe(newer.id);
    expect((response.body as { id: string }).id).not.toBe(older.id);
    expect((response.body as { summary: string }).summary).toBe('Newer analysis');
  });

  it('(4) never calls the Claude API: generating once then reading twice calls the stub exactly once total', async () => {
    const { cookies, userId } = await registerAndLogin(SUITE_EMAIL_A);
    createStub.mockResolvedValueOnce(stubMessage(VALID_PAYLOAD));

    const advisorService = moduleFixture.get(AdvisorService);
    await advisorService.analyze(userId);

    const first = await request(app.getHttpServer())
      .get('/advisor/analysis/latest')
      .set('Cookie', cookies);
    const second = await request(app.getHttpServer())
      .get('/advisor/analysis/latest')
      .set('Cookie', cookies);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).toEqual(second.body);
    expect(createStub).toHaveBeenCalledTimes(1);
  });

  it('(5) a second user never sees the first user\'s analysis', async () => {
    const { userId: userIdA } = await registerAndLogin(SUITE_EMAIL_A);
    const { cookies: cookiesB } = await registerAndLogin(SUITE_EMAIL_B);

    await prisma.advisorAnalysis.create({
      data: {
        userId: userIdA,
        recommendedPortfolioIds: [],
        score: 5,
        summary: 'Belongs to user A',
        strengths: [],
        risks: [],
        recommendations: [],
        impactMetrics: [],
        model: 'claude-sonnet-5',
      },
    });

    const response = await request(app.getHttpServer())
      .get('/advisor/analysis/latest')
      .set('Cookie', cookiesB);

    expect(response.status).toBe(404);
  });
});
