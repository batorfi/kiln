// kiln/tests/runner/live-gate.test.ts — r16 T005: proves the live-model tier's own gating logic, both halves — a reachable
// Ollama with the named model installed is reported available (and this host really does have one: gemma4:12b, confirmed
// 2026-11-01), and an unreachable endpoint or a missing model is reported unavailable with a named, printed reason, never a
// silent skip and never a silent pass.
import { test } from "node:test";
import assert from "node:assert/strict";
import { liveModel, ollamaBaseUrl, probeLiveModel, skipOption } from "../live-gate.ts";

// Probed once at module load (top-level await), not once per test: this file's own case for "LIVE" below reuses it
// rather than dialing Ollama twice for the same answer.
const liveStatus = await probeLiveModel();

const withEnv = (vars: Record<string, string | undefined>, fn: () => Promise<void> | void) => {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  const restore = () => { for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } };
  for (const [k, v] of Object.entries(vars)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  return Promise.resolve(fn()).finally(restore);
};

test("liveModel() defaults to gemma4:12b (legacy's own convention) and honors KILN_LIVE_MODEL", async () => {
  await withEnv({ KILN_LIVE_MODEL: undefined }, () => assert.equal(liveModel(), "gemma4:12b"));
  await withEnv({ KILN_LIVE_MODEL: "other-model:7b" }, () => assert.equal(liveModel(), "other-model:7b"));
  await withEnv({ KILN_LIVE_MODEL: "  " }, () => assert.equal(liveModel(), "gemma4:12b", "blank is treated as unset"));
});

test("ollamaBaseUrl() is loopback-only by construction (constitution VIII) regardless of KILN_OLLAMA_PORT", async () => {
  await withEnv({ KILN_OLLAMA_PORT: undefined }, () => assert.equal(ollamaBaseUrl(), "http://127.0.0.1:11434"));
  await withEnv({ KILN_OLLAMA_PORT: "11555" }, () => assert.equal(ollamaBaseUrl(), "http://127.0.0.1:11555"));
});

test("an unreachable Ollama is reported unavailable with a named reason, never thrown", async () => {
  await withEnv({ KILN_OLLAMA_PORT: "1" }, async () => { // nothing listens on port 1
    const status = await probeLiveModel();
    assert.equal(status.available, false);
    assert.match(status.reason, /not reachable/);
    assert.equal(skipOption(status).skip, `live-model tier: ${status.reason}`);
  });
});

test("a reachable Ollama with the named model NOT installed is reported unavailable, naming the model", async () => {
  await withEnv({ KILN_LIVE_MODEL: "definitely-not-a-real-model:999b" }, async () => {
    const status = await probeLiveModel();
    if (status.reason.startsWith("Ollama not reachable")) return; // this host has no Ollama at all: the "not installed" case does not apply here
    assert.equal(status.available, false);
    assert.match(status.reason, /not installed/);
    assert.match(status.reason, /definitely-not-a-real-model:999b/);
  });
});

test("LIVE: a real, running Ollama with the pinned default model installed is reported available", skipOption(liveStatus), () => {
  assert.equal(liveStatus.available, true, liveStatus.reason);
  assert.equal(liveStatus.model, liveModel());
  assert.equal(skipOption(liveStatus).skip, false);
});
