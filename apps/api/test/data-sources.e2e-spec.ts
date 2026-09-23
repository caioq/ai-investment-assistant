import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * DATA_SOURCES_SHARED_T-4 — `ImportLog` + `/data-sources/imports`.
 *
 * Full-app e2e per CONVENTIONS.md -> "Testing": real `AppModule`,
 * `configureApp(app)` before `.init()` so the cookie-guarded routes work,
 * fixture emails namespaced to this suite, and an `afterEach` that deletes
 * only the rows those emails created (never an unscoped `deleteMany`, which
 * races parallel suites against the same test Postgres).
 */
const SUITE_EMAILS = [
  'data-sources-e2e-1@example.com',
  'data-sources-e2e-2@example.com',
  'data-sources-e2e-3@example.com',
  'data-sources-e2e-4@example.com',
  'data-sources-e2e-5@example.com',
];

describe('DataSourcesController (e2e) - /data-sources/imports', () => {
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
    await prisma.importLog.deleteMany({
      where: { user: { email: { in: SUITE_EMAILS } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: SUITE_EMAILS } } });
  });

  /** Registers a user, returning the `access_token` cookie array (register
   * itself sets the cookie — see `auth.e2e-spec.ts`). */
  async function authCookies(email: string): Promise<string[]> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'super-secret-password', name: 'Data Sources E2E User' });

    const setCookieHeader = response.headers['set-cookie'];
    return Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  }

  it('returns 401 when no auth cookie is sent to POST /data-sources/imports', async () => {
    const response = await request(app.getHttpServer())
      .post('/data-sources/imports')
      .send({ source: 'ASSETS', fileName: 'assets.csv', records: 8, status: 'IMPORTED' });

    expect(response.status).toBe(401);
  });

  it('creates an ImportLog preserving every errors[] entry in order', async () => {
    const cookies = await authCookies(SUITE_EMAILS[0]);

    const response = await request(app.getHttpServer())
      .post('/data-sources/imports')
      .set('Cookie', cookies)
      .send({
        source: 'ASSETS',
        fileName: 'assets.csv',
        records: 8,
        status: 'IMPORTED',
        errors: ['row 3: unknown ticker', 'row 7: empty ticker'],
      });

    expect(response.status).toBe(201);
    expect(response.body.source).toBe('ASSETS');
    expect(response.body.fileName).toBe('assets.csv');
    expect(response.body.records).toBe(8);
    expect(response.body.status).toBe('IMPORTED');
    expect(response.body.errors).toEqual(['row 3: unknown ticker', 'row 7: empty ticker']);

    const persisted = await prisma.importLog.findUniqueOrThrow({
      where: { id: response.body.id },
    });
    expect(persisted.errors).toEqual(['row 3: unknown ticker', 'row 7: empty ticker']);
  });

  it("lists only the caller's own import logs", async () => {
    const firstUserCookies = await authCookies(SUITE_EMAILS[1]);
    const secondUserCookies = await authCookies(SUITE_EMAILS[2]);

    const body = {
      source: 'HOLDINGS',
      fileName: 'holdings.csv',
      records: 4,
      status: 'IMPORTED',
    };

    const created = await request(app.getHttpServer())
      .post('/data-sources/imports')
      .set('Cookie', firstUserCookies)
      .send(body);
    expect(created.status).toBe(201);

    const otherUsersRow = await request(app.getHttpServer())
      .post('/data-sources/imports')
      .set('Cookie', secondUserCookies)
      .send(body);
    expect(otherUsersRow.status).toBe(201);

    const response = await request(app.getHttpServer())
      .get('/data-sources/imports')
      .set('Cookie', firstUserCookies);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(created.body.id);
    expect(response.body.map((row: { id: string }) => row.id)).not.toContain(otherUsersRow.body.id);
  });

  it('returns rows newest first and honours ?limit=', async () => {
    const cookies = await authCookies(SUITE_EMAILS[3]);

    const first = await request(app.getHttpServer())
      .post('/data-sources/imports')
      .set('Cookie', cookies)
      .send({ source: 'ASSETS', fileName: 'first.csv', records: 1, status: 'IMPORTED' });
    const second = await request(app.getHttpServer())
      .post('/data-sources/imports')
      .set('Cookie', cookies)
      .send({ source: 'REPORT', fileName: 'second.pdf', records: 1, status: 'FAILED' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const all = await request(app.getHttpServer())
      .get('/data-sources/imports')
      .set('Cookie', cookies);

    expect(all.status).toBe(200);
    expect(all.body.map((row: { fileName: string }) => row.fileName)).toEqual([
      'second.pdf',
      'first.csv',
    ]);

    const limited = await request(app.getHttpServer())
      .get('/data-sources/imports?limit=1')
      .set('Cookie', cookies);

    expect(limited.status).toBe(200);
    expect(limited.body).toHaveLength(1);
    expect(limited.body[0].fileName).toBe('second.pdf');
  });

  it('returns 400 for an unknown source', async () => {
    const cookies = await authCookies(SUITE_EMAILS[4]);

    const response = await request(app.getHttpServer())
      .post('/data-sources/imports')
      .set('Cookie', cookies)
      .send({ source: 'NOPE', fileName: 'assets.csv', records: 8, status: 'IMPORTED' });

    expect(response.status).toBe(400);

    const count = await prisma.importLog.count({
      where: { user: { email: SUITE_EMAILS[4] } },
    });
    expect(count).toBe(0);
  });
});
