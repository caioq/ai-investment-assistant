// Unit-style spec (no database, no Nest app). It lives under test/ with the
// e2e suffix because the seed sits outside src/, where the unit Jest config
// doesn't reach (see CONVENTIONS.md -> Testing).
import { assertSeedAllowed } from '../../prisma/seed/guard';

const LOCAL_URL = 'postgresql://postgres:postgres@localhost:5432/investment_assistant';
const REMOTE_URL = 'postgresql://u:p@prod.example.com:5432/x';

describe('assertSeedAllowed', () => {
  describe('refuses to run', () => {
    it.each<[string, NodeJS.ProcessEnv, string]>([
      [
        'NODE_ENV=production with a localhost URL',
        { NODE_ENV: 'production', DATABASE_URL: LOCAL_URL },
        'production',
      ],
      [
        'NODE_ENV=production with a remote URL and DEMO_SEED_ALLOW_REMOTE=true',
        { NODE_ENV: 'production', DATABASE_URL: REMOTE_URL, DEMO_SEED_ALLOW_REMOTE: 'true' },
        'production',
      ],
      [
        'a remote host without the override',
        { DATABASE_URL: REMOTE_URL },
        'DEMO_SEED_ALLOW_REMOTE',
      ],
      [
        'a remote host with a non-"true" override',
        { DATABASE_URL: REMOTE_URL, DEMO_SEED_ALLOW_REMOTE: '1' },
        'DEMO_SEED_ALLOW_REMOTE',
      ],
      ['DATABASE_URL unset', {}, 'DATABASE_URL'],
      ['DATABASE_URL that is not a URL', { DATABASE_URL: 'not a url' }, 'DATABASE_URL'],
    ])('%s', (_label, env, rule) => {
      expect(() => assertSeedAllowed(env)).toThrow(Error);
      expect(() => assertSeedAllowed(env)).toThrow(rule);
    });
  });

  describe('allows', () => {
    it('a remote host with DEMO_SEED_ALLOW_REMOTE=true', () => {
      expect(() =>
        assertSeedAllowed({ DATABASE_URL: REMOTE_URL, DEMO_SEED_ALLOW_REMOTE: 'true' }),
      ).not.toThrow();
    });

    it.each(['localhost', '127.0.0.1', '[::1]', 'db', 'db-test'])('host %s', (host) => {
      expect(() =>
        assertSeedAllowed({
          DATABASE_URL: `postgresql://postgres:postgres@${host}:5432/x?schema=public`,
        }),
      ).not.toThrow();
    });
  });
});
