// r16 T011 — the residency manager: load/unload semantics (including R11's keep_alive pinning), the budget check, and
// reconcile()'s bypass detection, against a fake HTTP layer. The LIVE case runs probe() for real and confirms load()
// actually sends Ollama's own "never expire" keep_alive rather than its ~5-minute default (research R11) — verified
// by spying on the real request, not by literally waiting out Ollama's default expiry in every test run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createResidency, ResidencyBudgetError } from "#lane/residency.ts";
import { liveModel, ollamaBaseUrl, probeLiveModel, skipOption } from "../../../tests/live-gate.ts";

type FakeCall = { url: string; init?: RequestInit };

/** Replaces global fetch with a scripted fake for the duration of `fn`, recording every call. */
async function withFakeFetch<T>(handler: (call: FakeCall) => Promise<Response> | Response, fn: (calls: FakeCall[]) => Promise<T>): Promise<T> {
  const calls: FakeCall[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(url), init };
    calls.push(call);
    return handler(call);
  }) as typeof fetch;
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = original;
  }
}

const json = (body: unknown, ok = true): Response => new Response(JSON.stringify(body), { status: ok ? 200 : 500 });

const TAGS = (models: Array<{ name: string; size: number }>) => json({ models });
const GENERATE_DONE = (reason: "load" | "unload") => json({ done: true, done_reason: reason });
const PS = (names: string[]) => json({ models: names.map((name) => ({ name })) });

test("load() sends Ollama's -1 (never expire) keep_alive, never the default", () =>
  withFakeFetch(
    (call) => (call.url.endsWith("/api/tags") ? TAGS([{ name: "m1", size: 100 }]) : GENERATE_DONE("load")),
    async (calls) => {
      const residency = createResidency({ budgetBytes: 1_000_000 });
      await residency.load("m1");
      const generateCall = calls.find((c) => c.url.endsWith("/api/generate"));
      assert.ok(generateCall, "load() must call /api/generate");
      const body = JSON.parse(String(generateCall!.init!.body));
      assert.equal(body.model, "m1");
      assert.equal(body.keep_alive, -1, "load() must pin keep_alive, never leave Ollama's ~5-minute default in effect");
    },
  ));

test("unload() sends keep_alive: 0, for a model this manager actually has resident", () =>
  withFakeFetch(
    (call) => (call.url.endsWith("/api/tags") ? TAGS([{ name: "m1", size: 100 }]) : GENERATE_DONE(call.url.endsWith("/api/generate") && JSON.parse(String(call.init!.body)).keep_alive === 0 ? "unload" : "load")),
    async (calls) => {
      const residency = createResidency({ budgetBytes: 1_000_000 });
      await residency.load("m1"); // must be resident through this manager first — unload() of an unknown model is a no-op (below)
      const result = await residency.unload("m1");
      assert.equal(result.unloaded, true);
      const generateCalls = calls.filter((c) => c.url.endsWith("/api/generate"));
      assert.equal(generateCalls.length, 2, "one load, one unload");
      const unloadBody = JSON.parse(String(generateCalls[1].init!.body));
      assert.equal(unloadBody.keep_alive, 0);
    },
  ));

test("unload() of a model this manager never loaded is a no-op — no request at all", () =>
  withFakeFetch(
    () => GENERATE_DONE("unload"),
    async (calls) => {
      const residency = createResidency({ budgetBytes: 1_000_000 });
      const result = await residency.unload("never-loaded");
      assert.equal(result.unloaded, false);
      assert.equal(calls.length, 0);
    },
  ));

test("a load that would exceed the budget is refused before any /api/generate call", () =>
  withFakeFetch(
    (call) => (call.url.endsWith("/api/tags") ? TAGS([{ name: "big", size: 1_000_000 }]) : GENERATE_DONE("load")),
    async (calls) => {
      const residency = createResidency({ budgetBytes: 999_999 });
      await assert.rejects(residency.load("big"), ResidencyBudgetError);
      assert.ok(!calls.some((c) => c.url.endsWith("/api/generate")), "the budget refusal happens before any load request");
    },
  ));

test("T034: a second model refused for lack of budget succeeds once the first is released — the budget is never silently exceeded, but never permanently stuck either", () =>
  withFakeFetch(
    (call) => (call.url.endsWith("/api/tags") ? TAGS([{ name: "m1", size: 600_000 }, { name: "m2", size: 600_000 }]) : GENERATE_DONE("load")),
    async () => {
      const residency = createResidency({ budgetBytes: 1_000_000 }); // room for exactly one of {m1, m2}, never both
      await residency.load("m1");
      await assert.rejects(residency.load("m2"), ResidencyBudgetError, "m1 (600k) + m2 (600k) exceeds the 1,000,000-byte budget");
      await residency.unload("m1");
      await residency.load("m2"); // now there is room: this must succeed, not stay refused forever — assert.rejects above would have thrown again otherwise
    },
  ));

test("asking for an already-resident model is not a load (no second /api/generate call)", () =>
  withFakeFetch(
    (call) => (call.url.endsWith("/api/tags") ? TAGS([{ name: "m1", size: 100 }]) : GENERATE_DONE("load")),
    async (calls) => {
      const residency = createResidency({ budgetBytes: 1_000_000 });
      await residency.load("m1");
      const generateCallsBefore = calls.filter((c) => c.url.endsWith("/api/generate")).length;
      await residency.load("m1");
      const generateCallsAfter = calls.filter((c) => c.url.endsWith("/api/generate")).length;
      assert.equal(generateCallsAfter, generateCallsBefore, "re-asking for the same resident model does not re-load it");
    },
  ));

test("a pinned model survives unload() with no /api/generate call (FR-024)", () =>
  withFakeFetch(
    (call) => (call.url.endsWith("/api/tags") ? TAGS([{ name: "m1", size: 100 }]) : GENERATE_DONE("load")),
    async (calls) => {
      const residency = createResidency({ budgetBytes: 1_000_000 });
      await residency.load("m1", { pin: true });
      const before = calls.length;
      await residency.unload("m1");
      assert.equal(calls.length, before, "a pinned model's unload() makes no request at all");
    },
  ));

test("reconcile() reports a model Ollama runs that this manager never asked for", () =>
  withFakeFetch(
    () => PS(["bypassed-model"]),
    async () => {
      const residency = createResidency({ budgetBytes: 1_000_000 });
      const report = await residency.reconcile();
      assert.ok(report);
      assert.equal(report!.model, "bypassed-model");
    },
  ));

test("reconcile(expected) adopts a model it is about to request, rather than reporting it — a restarted process's empty bookkeeping must not block resuming after a kill (found at T038/T039)", () =>
  withFakeFetch(
    (call) => (call.url.endsWith("/api/tags") ? TAGS([{ name: "gemma4:12b", size: 100 }]) : call.url.endsWith("/api/ps") ? PS(["gemma4:12b"]) : GENERATE_DONE("unload")),
    async () => {
      // a FRESH residency instance — exactly a restarted process's own empty "own" map — with the model already
      // resident through Ollama's own keep_alive:-1 from a PREVIOUS (now-dead) process
      const residency = createResidency({ budgetBytes: 1_000_000 });
      const report = await residency.reconcile("gemma4:12b");
      assert.equal(report, null, "the expected model must be adopted, not reported as a broken guarantee");
      // proof the adoption is real, not a silent skip: unload() must now actually act on it (own.has is true)
      const result = await residency.unload("gemma4:12b");
      assert.equal(result.unloaded, true, "the adopted model must be genuinely tracked — unload() must not be a no-op for it");
    },
  ));

test("reconcile(expected) still reports a DIFFERENT model Ollama runs that this manager never asked for, even with an expected model given", () =>
  withFakeFetch(
    () => PS(["bypassed-model"]),
    async () => {
      const residency = createResidency({ budgetBytes: 1_000_000 });
      const report = await residency.reconcile("some-other-model");
      assert.ok(report, "a genuinely unexpected resident model must still be reported");
      assert.equal(report!.model, "bypassed-model");
    },
  ));

test("reconcile() returns null when every running model is this manager's own", () =>
  withFakeFetch(
    (call) => (call.url.endsWith("/api/tags") ? TAGS([{ name: "m1", size: 100 }]) : call.url.endsWith("/api/ps") ? PS(["m1"]) : GENERATE_DONE("load")),
    async () => {
      const residency = createResidency({ budgetBytes: 1_000_000 });
      await residency.load("m1");
      assert.equal(await residency.reconcile(), null);
    },
  ));

const liveStatus = await probeLiveModel();

test("LIVE: probe() reports real readiness, and load() really pins keep_alive on the installed Ollama", skipOption(liveStatus), async (t) => {
  const realFetch = globalThis.fetch;
  const generateBodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).endsWith("/api/generate") && init?.body) generateBodies.push(JSON.parse(String(init.body)));
    return realFetch(url, init);
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = realFetch; });

  const residency = createResidency({ budgetBytes: 64 * 1024 * 1024 * 1024 });
  const readiness = await residency.probe(liveModel());
  assert.equal(readiness.toolCalling, true);
  assert.equal(readiness.streaming, true);
  assert.equal(readiness.usageAccounting, true);
  assert.ok(readiness.contextWindow > 0);

  await residency.load(liveModel());
  assert.ok(generateBodies.some((b) => b.model === liveModel() && b.keep_alive === -1), "load() really sent Ollama's -1 keep_alive, not its ~5-minute default (research R11)");
  await residency.unload(liveModel()); // leave the host as found
});
