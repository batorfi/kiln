// r16 T009 — Ollama registered as a pi-ai `openai-completions` provider. Unit-level: the registered shape, no live
// Ollama needed. The LIVE case makes one real request end to end.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createModels } from "@earendil-works/pi-ai";
import { createOllamaProvider, modelFor, OLLAMA_PROVIDER_ID, ollamaBaseUrl } from "#workers/provider.ts";
import { liveModel, probeLiveModel, skipOption } from "../../../tests/live-gate.ts";

test("createOllamaProvider registers id, name, baseUrl and a keyless api-key auth", async () => {
  const provider = createOllamaProvider();
  assert.equal(provider.id, OLLAMA_PROVIDER_ID);
  assert.equal(provider.baseUrl, "http://127.0.0.1:11434/v1");
  assert.ok(provider.auth.apiKey, "a keyless local server still declares apiKey auth");
  const resolved = await provider.auth.apiKey!.resolve({ ctx: {} as never, signal: new AbortController().signal });
  assert.equal(resolved?.auth.apiKey, "kiln-ollama-local");
});

test("createOllamaProvider honors a custom port", () => {
  const provider = createOllamaProvider({ port: 11555 });
  assert.equal(provider.baseUrl, "http://127.0.0.1:11555/v1");
  assert.equal(ollamaBaseUrl(11555), "http://127.0.0.1:11555/v1");
});

test("the provider's static catalog is empty by design; modelFor builds a Model on demand", () => {
  const provider = createOllamaProvider();
  assert.deepEqual(provider.getModels(), []);
  const model = modelFor("gemma4:12b", { contextWindow: 262_144 });
  assert.equal(model.provider, OLLAMA_PROVIDER_ID);
  assert.equal(model.api, "openai-completions");
  assert.equal(model.contextWindow, 262_144);
  assert.deepEqual(model.cost, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
});

test("setProvider registers it on a real Models collection without throwing", () => {
  const models = createModels();
  models.setProvider(createOllamaProvider());
  assert.ok(models.getProvider(OLLAMA_PROVIDER_ID));
});

const liveStatus = await probeLiveModel();

test("LIVE: a real completion against the installed Ollama, through the registered provider end to end", skipOption(liveStatus), async () => {
  const models = createModels();
  models.setProvider(createOllamaProvider());
  const model = modelFor(liveModel(), { contextWindow: 262_144 });
  const reply = await models.complete(model, { messages: [{ role: "user", content: "Reply with exactly: OK", timestamp: Date.now() }] });
  assert.equal(reply.role, "assistant");
  assert.equal(reply.provider, OLLAMA_PROVIDER_ID);
  assert.ok(reply.usage.totalTokens > 0, "a real response carries real usage");
});
