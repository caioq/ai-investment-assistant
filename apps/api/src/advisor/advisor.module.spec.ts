import { Test } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AdvisorModule } from './advisor.module';
import { AdvisorService } from './advisor.service';
import { ANTHROPIC_CLIENT } from './providers/anthropic-client.interface';

/**
 * `AdvisorService` injects `PrismaService`, normally satisfied by the
 * app-wide `@Global()` `PrismaModule` (see CONVENTIONS.md -> "Module
 * structure") — but this spec compiles `AdvisorModule` in isolation, so
 * that global registration never happens implicitly. `PrismaModule` is
 * imported explicitly here (only in the test) and its `PrismaService`
 * overridden with a stub, rather than constructing a real `PrismaPg`
 * adapter against `DATABASE_URL` (CONVENTIONS.md -> "Testing").
 */
const prismaStub = {} as PrismaService;

/**
 * `AdvisorModule` imports `PortfolioModule`, which in turn imports
 * `MarketDataModule` — `MarketDataService` injects `EventEmitter2`
 * (PORTFOLIO_US-5_T-2), normally satisfied by the app-wide
 * `EventEmitterModule.forRoot()` registered once in `app.module.ts`
 * (CONVENTIONS.md -> "Cross-module events"). Added to this standalone
 * module test's own imports, same as `market-data.module.spec.ts`.
 */
function compileAdvisorModule() {
  return Test.createTestingModule({
    imports: [PrismaModule, EventEmitterModule.forRoot(), AdvisorModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaStub)
    .compile();
}

describe('AdvisorModule', () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
  });

  it('compiles and resolves AdvisorService', async () => {
    process.env.ANTHROPIC_API_KEY = 'dummy-key-for-test';

    const module = await compileAdvisorModule();

    expect(module.get(AdvisorService)).toBeInstanceOf(AdvisorService);
  });

  it('resolves the ANTHROPIC_CLIENT token to a client shaped like { messages: { create } }', async () => {
    process.env.ANTHROPIC_API_KEY = 'dummy-key-for-test';

    const module = await compileAdvisorModule();

    const client = module.get(ANTHROPIC_CLIENT);
    expect(client).toBeDefined();
    expect(typeof client.messages.create).toBe('function');
  });

  it('fails fast with a message naming ANTHROPIC_API_KEY when the env var is absent', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    await expect(compileAdvisorModule()).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});
