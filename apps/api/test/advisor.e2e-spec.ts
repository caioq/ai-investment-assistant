import { readFileSync } from 'fs';
import { join } from 'path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

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
 * ADVISOR_US-1_T-2 — `POST /advisor/reports/upload`.
 *
 * Extends the full-app e2e pattern from the `AdvisorController (e2e)` suite
 * above (CONVENTIONS.md -> "Testing"): real `AppModule`, `configureApp(app)`
 * before `.init()` so the cookie-guarded route works, its own scoped
 * `afterEach` (deletes only rows this suite's fixture emails created), and
 * fixture emails namespaced to this suite so parallel e2e suites against the
 * same test Postgres don't delete each other's rows.
 */
const FIXTURE_DIR = join(__dirname, 'fixtures', 'advisor');

function readFixture(name: string): Buffer {
  return readFileSync(join(FIXTURE_DIR, name));
}

const UPLOAD_SUITE_EMAILS = [
  'advisor-upload-e2e-1@example.com',
  'advisor-upload-e2e-2@example.com',
  'advisor-upload-e2e-3@example.com',
  'advisor-upload-e2e-4@example.com',
];

describe('AdvisorController (e2e) - POST /advisor/reports/upload', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prisma.advisorReport.deleteMany({
      where: { user: { email: { in: UPLOAD_SUITE_EMAILS } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: UPLOAD_SUITE_EMAILS } } });
  });

  /** Registers a user, returning the `access_token` cookie array (register
   * itself sets the cookie — see `auth.e2e-spec.ts`). */
  async function authCookies(email: string): Promise<string[]> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'super-secret-password' });

    const setCookieHeader = response.headers['set-cookie'];
    return Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  }

  it('returns 401 when no auth cookie is sent', async () => {
    const response = await request(app.getHttpServer())
      .post('/advisor/reports/upload')
      .send({ text: 'some prose' });

    expect(response.status).toBe(401);
  });

  it('persists an AdvisorReport with non-empty rawText and a matching fileName for a valid PDF upload', async () => {
    const cookies = await authCookies(UPLOAD_SUITE_EMAILS[0]);

    const response = await request(app.getHttpServer())
      .post('/advisor/reports/upload')
      .set('Cookie', cookies)
      .attach('file', readFixture('stub-report.pdf'), 'stub-report.pdf');

    expect([200, 201]).toContain(response.status);
    expect(response.body.fileName).toBe('stub-report.pdf');
    expect(response.body.rawText.length).toBeGreaterThan(0);

    const persisted = await prisma.advisorReport.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    expect(persisted.rawText.length).toBeGreaterThan(0);
    expect(persisted.fileName).toBe('stub-report.pdf');
  });

  it('persists an AdvisorReport with rawText equal to the posted text and fileName: null for a JSON text upload', async () => {
    const cookies = await authCookies(UPLOAD_SUITE_EMAILS[1]);

    const response = await request(app.getHttpServer())
      .post('/advisor/reports/upload')
      .set('Cookie', cookies)
      .send({ text: 'some prose' });

    expect([200, 201]).toContain(response.status);
    expect(response.body.rawText).toBe('some prose');
    expect(response.body.fileName).toBeNull();

    const persisted = await prisma.advisorReport.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    expect(persisted.rawText).toBe('some prose');
    expect(persisted.fileName).toBeNull();
  });

  it('returns 400 and persists no AdvisorReport row for a non-PDF multipart upload', async () => {
    const cookies = await authCookies(UPLOAD_SUITE_EMAILS[2]);

    const response = await request(app.getHttpServer())
      .post('/advisor/reports/upload')
      .set('Cookie', cookies)
      .attach('file', Buffer.from('not a pdf'), 'not-a-pdf.pdf');

    expect(response.status).toBe(400);

    const count = await prisma.advisorReport.count({
      where: { user: { email: UPLOAD_SUITE_EMAILS[2] } },
    });
    expect(count).toBe(0);
  });

  it('returns 400 when neither a file nor text is provided', async () => {
    const cookies = await authCookies(UPLOAD_SUITE_EMAILS[3]);

    const response = await request(app.getHttpServer())
      .post('/advisor/reports/upload')
      .set('Cookie', cookies)
      .send({});

    expect(response.status).toBe(400);
  });
});
