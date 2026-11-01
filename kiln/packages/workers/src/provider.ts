// `packages/workers/src/provider.ts` — registers Ollama as a `pi-ai` provider (r16 T009, research R1).
//
// pi-ai ships no dedicated Ollama provider (confirmed by reading the installed package, not assumed — see
// research.md R1): its `api/` modules are per-concrete-API (`openai-completions`, `anthropic-messages`, …), one per
// upstream wire format, not per vendor. Ollama's own server exposes an OpenAI-compatible endpoint whose shape matches
// `openai-completions` exactly, so Ollama is registered as a `Provider<"openai-completions">` pointed at that endpoint.
//
// This is `packages/workers/`'s ONLY import of `pi-ai`'s request surface (`stream`, `createProvider`) — the row's one
// real call site (research R2, R9); `packages/durable/src/library/open.ts`'s existing `createModels()` call stays at
// zero registered providers, untouched.
import { createProvider, type Model, type Provider } from "@earendil-works/pi-ai";
import { stream, streamSimple } from "@earendil-works/pi-ai/api/openai-completions";

export const OLLAMA_PROVIDER_ID = "kiln-ollama";
const DEFAULT_PORT = 11434;

export function ollamaBaseUrl(port: number = DEFAULT_PORT): string {
  return `http://127.0.0.1:${port}/v1`;
}

/**
 * Registers Ollama. `models: []`: this provider's static catalog is deliberately empty — `modelFor()` builds a
 * `Model` object for whatever name is actually resident (research R8's readiness probe, not this provider's own
 * listing, is what checks a model is real). `Models.complete()`/`stream()` dispatch on the `Model` object the caller
 * supplies, not on catalog membership, so an empty static list does not stop a real call.
 */
export function createOllamaProvider(opts: { port?: number } = {}): Provider<"openai-completions"> {
  const baseUrl = ollamaBaseUrl(opts.port);
  return createProvider<"openai-completions">({
    id: OLLAMA_PROVIDER_ID,
    name: "Ollama (local)",
    baseUrl,
    auth: {
      apiKey: {
        name: "Ollama (local, keyless)",
        // Ambient, ever-configured: Ollama's own endpoint does not check this value (research R1), but every pi-ai
        // provider declares an auth type — even a keyless local server resolves one (ProviderAuth's own invariant).
        async resolve() {
          return { auth: { apiKey: "kiln-ollama-local" }, source: "ambient (loopback, no credential needed)" };
        },
      },
    },
    models: [],
    // `createProvider` expects a `ProviderStreams`-shaped object ({stream, streamSimple}), not the bare `stream`
    // function — confirmed against the real implementation (models.js: `input.api.stream` must itself be a
    // function), not assumed from the .d.ts alone.
    api: { stream, streamSimple },
  });
}

/**
 * Builds a `Model<"openai-completions">` entry for `name` on demand — this provider's catalog is empty by design
 * (see `createOllamaProvider`), so every call site that needs a `Model` object constructs one here rather than
 * looking one up. `contextWindow`/`maxTokens` come from the residency manager's readiness probe (R8), never guessed.
 */
export function modelFor(name: string, opts: { contextWindow: number; maxTokens?: number; port?: number }): Model<"openai-completions"> {
  return {
    id: name,
    name,
    api: "openai-completions",
    provider: OLLAMA_PROVIDER_ID,
    baseUrl: ollamaBaseUrl(opts.port),
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    reasoning: false,
    contextWindow: opts.contextWindow,
    maxTokens: opts.maxTokens ?? opts.contextWindow,
  };
}
