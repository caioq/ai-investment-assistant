import Anthropic from '@anthropic-ai/sdk';
import { Provider } from '@nestjs/common';
import { ANTHROPIC_CLIENT, AnthropicClient } from './anthropic-client.interface';

const MISSING_API_KEY_MESSAGE =
  'ANTHROPIC_API_KEY environment variable is required to call the Anthropic API (see .env.example). ' +
  'The server started without it so every other module keeps working locally; only /advisor/analyze fails, and only when actually called.';

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
 * (CONVENTIONS.md -> "Auth"). Unlike `JWT_SECRET` (needed by every request
 * via `JwtStrategy`), a missing key here is scoped to one module: without
 * it, this factory returns a stub satisfying `AnthropicClient` whose
 * `messages.create` rejects with `MISSING_API_KEY_MESSAGE` instead of
 * throwing at construction time. That keeps Nest's DI graph resolvable
 * (and the rest of the app — auth, portfolio, market-data — booting and
 * servable) when a developer hasn't set up advisor credentials locally;
 * only an actual `POST /advisor/analyze` call surfaces the error, as a
 * normal request failure rather than a boot-time crash of the whole API.
 */
export const anthropicClientProvider: Provider = {
  provide: ANTHROPIC_CLIENT,
  useFactory: (): AnthropicClient => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        messages: {
          create: () => Promise.reject(new Error(MISSING_API_KEY_MESSAGE)),
        },
      };
    }
    return new Anthropic({ apiKey });
  },
};
