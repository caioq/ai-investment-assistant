// Spawns the real `pnpm --filter api run db:seed` CLI. Only the two refusal paths
// are exercised: a successful run would write the real, non-namespaced demo
// fixtures into the shared test database.
import { spawnSync } from 'child_process';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { DEMO_FIXTURES } from '../../prisma/seed/data';

const REPO_ROOT = path.resolve(__dirname, '../../../..');

function runSeedCli(env: NodeJS.ProcessEnv) {
  const start = Date.now();
  const result = spawnSync('pnpm', ['--filter', 'api', 'run', 'db:seed'], {
    cwd: REPO_ROOT,
    env: { ...process.env, DEMO_SEED_ALLOW_REMOTE: '', ...env },
    encoding: 'utf8',
    timeout: 60000,
  });
  return { result, output: `${result.stdout}${result.stderr}`, elapsedMs: Date.now() - start };
}

describe('db:seed command (refusal paths)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const demoUserCount = () => prisma.user.count({ where: { email: DEMO_FIXTURES.user.email } });

  it('refuses under NODE_ENV=production and writes no user', async () => {
    const before = await demoUserCount();

    const { result, output } = runSeedCli({ NODE_ENV: 'production' });

    expect(result.status).not.toBe(0);
    expect(output).toContain('production');
    expect(await demoUserCount()).toBe(before);
  }, 90000);

  it('refuses a remote DATABASE_URL quickly, without connecting or writing', async () => {
    const before = await demoUserCount();

    const { result, output, elapsedMs } = runSeedCli({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://u:p@prod.example.com:5432/x',
    });

    expect(result.status).not.toBe(0);
    expect(output).toContain('DEMO_SEED_ALLOW_REMOTE');
    expect(elapsedMs).toBeLessThan(10000);
    expect(await demoUserCount()).toBe(before);
  }, 90000);
});
