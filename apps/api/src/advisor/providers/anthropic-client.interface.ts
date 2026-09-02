import type Anthropic from '@anthropic-ai/sdk';

/**
 * Narrow contract describing the single Anthropic SDK call this module
 * makes (`AdvisorService.analyze`, implemented by `ADVISOR_US-2_T-3`) —
 * `messages.create`. Deliberately not a wrapper around the whole `Anthropic`
 * client: a test can inject a stub shaped like
 * `{ messages: { create: jest.fn() } }` without constructing a real
 * `Anthropic` instance or touching the network (spec.md's "verify via a
 * mocked client asserting call count" AC).
 *
 * Reuses the SDK's own exported `MessageCreateParamsNonStreaming`/`Message`
 * types rather than redefining an equivalent shape, per the `claude-api`
 * skill's guidance ("Use SDK types ... don't redefine equivalent
 * interfaces"). `MessageCreateParamsNonStreaming` (not the streaming
 * variant) is used because this module always awaits a single parsed
 * response — see spec.md -> Behavior Notes ("Thinking disabled ... keeps
 * the button responsive", no streaming mentioned).
 *
 * TypeScript interfaces don't survive to runtime, so Nest DI needs an
 * explicit injection token to bind an implementation to this contract —
 * same `PRICE_PROVIDER` pattern documented in CONVENTIONS.md -> "Module
 * structure" (`apps/api/src/market-data/providers/price-provider.interface.ts`).
 */
export interface AnthropicClient {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
}

/** Nest DI token for the `AnthropicClient` interface (see file docblock). */
export const ANTHROPIC_CLIENT = Symbol('ANTHROPIC_CLIENT');
