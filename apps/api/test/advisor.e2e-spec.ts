import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

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
