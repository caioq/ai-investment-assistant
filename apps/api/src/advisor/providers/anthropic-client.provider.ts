import Anthropic from '@anthropic-ai/sdk';
import { Provider } from '@nestjs/common';
import { ANTHROPIC_CLIENT } from './anthropic-client.interface';

/**
 * Binds the real `Anthropic` SDK client to the `ANTHROPIC_CLIENT` token
 * (see `anthropic-client.interface.ts`) — `AdvisorModule`'s `providers`
 * array registers this directly (a plain `Provider` object, not an
 * `@Injectable()` class bound via `useExisting` like `PRICE_PROVIDER`/
 * `B3YahooProvider`), since the real `Anthropic` instance already satisfies
 * `AnthropicClient` structurally with no wrapping class needed.
 *
 * `apps/api` has no `ConfigModule`/dotenv loader, so `process.env` is read
 * directly here — same pattern as `JWT_SECRET` in `auth.module.ts`
 * (CONVENTIONS.md -> "Auth"). The key is read and validated at provider
 * construction time (during module compile/bootstrap), not lazily on the
 * first `/advisor/analyze` request, so a misconfigured deploy fails at boot
 * with an obvious reason.
 */
export const anthropicClientProvider: Provider = {
  provide: ANTHROPIC_CLIENT,
  useFactory: (): Anthropic => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is required to construct the Anthropic client (see .env.example).',
      );
    }
    return new Anthropic({ apiKey });
  },
};
