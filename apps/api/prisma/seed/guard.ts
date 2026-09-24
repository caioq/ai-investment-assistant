// Layer 1 of the demo seed's production guard (specs/demo-seed/spec.md ->
// Behavior Notes -> Production guard). Pure on purpose: no Prisma import, so
// it can run before any PrismaClient (and any connection) exists.

/** Hosts the seed may target without an override: local and docker-compose.yml. */
const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'db', 'db-test']);

/**
 * Throws when the seed must not run against the database `env` points at.
 * Each message names the rule that was broken.
 */
export function assertSeedAllowed(env: NodeJS.ProcessEnv): void {
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'Refusing to seed: NODE_ENV is "production". The demo seed never runs in production, and DEMO_SEED_ALLOW_REMOTE does not override this.',
    );
  }

  const rawUrl = env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('Refusing to seed: DATABASE_URL is not set.');
  }

  let hostname: string;
  try {
    hostname = new URL(rawUrl).hostname;
  } catch {
    throw new Error('Refusing to seed: DATABASE_URL cannot be parsed as a URL.');
  }

  if (!ALLOWED_HOSTS.has(hostname) && env.DEMO_SEED_ALLOW_REMOTE !== 'true') {
    throw new Error(
      `Refusing to seed: DATABASE_URL host "${hostname}" is not a local database (${[...ALLOWED_HOSTS].join(', ')}). ` +
        'Set DEMO_SEED_ALLOW_REMOTE=true to seed a disposable remote database.',
    );
  }
}
