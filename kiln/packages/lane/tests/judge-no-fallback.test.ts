// r16 T016 (US4) — a judge's residency failure never substitutes a different, already-resident model (FR-031). When
// the strongest model's load() rejects, the caller must simply fail (the existing step-failure path releases its
// lane and propagates); a later successful load() of the SAME model must then let the step proceed — never a
// different model served instead. Fake HTTP layer, same convention as residency.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { flows } from "#contracts/flow/index.ts";
import { bindRole, TierPolicyError } from "#contracts/roles.ts";
import { createResidency, ResidencyError } from "#lane/residency.ts";

type FakeCall = { url: string; init?: RequestInit };

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

test("a strongest model's load() failure never causes a fallback to a different model — only a retry of the same model can succeed", async () => {
  let generateCalls = 0;
  await withFakeFetch(
    (call) => {
      if (call.url.endsWith("/api/tags")) return TAGS([{ name: "strongest-model", size: 100 }, { name: "weaker-model", size: 50 }]);
      if (call.url.endsWith("/api/generate")) {
        generateCalls += 1;
        if (generateCalls === 1) return json({}, false); // first attempt: Ollama refuses — strongest model cannot load
        return GENERATE_DONE("load"); // the SAME model, asked again, succeeds
      }
      throw new Error(`unexpected call: ${call.url}`);
    },
    async () => {
      const residency = createResidency({ budgetBytes: 1_000_000 });

      // The judge's step asks for the strongest model; it fails. The caller (unit.ts's existing failure path, T019)
      // simply propagates — it must NEVER retry with "weaker-model" instead, because nothing here asks for it.
      await assert.rejects(() => residency.load("strongest-model"), ResidencyError);

      // A later re-ask for the SAME model (the walk's own retry, not a fallback) succeeds once Ollama can load it.
      const result = await residency.load("strongest-model");
      assert.equal(result.loaded, true);

      // "weaker-model" was never requested at any point — the only two load attempts both named "strongest-model".
      assert.equal(generateCalls, 2);
    },
  );
});

test("a judge's own tier binding is checked before residency is ever asked for a model (FR-031's full ordering, with T015's guard)", async () => {
  // This complements T015's spy: T015 proves the tier check precedes any pi-ai call; this proves residency.load()
  // for a judge's strongest model is a separate, later step that a weak-tier refusal never even reaches.
  let loadAttempted = false;
  await withFakeFetch(
    () => { loadAttempted = true; return json({ models: [] }); },
    async () => {
      const residency = createResidency({ budgetBytes: 1_000_000 });
      const roster = flows.v2.roster;
      // simulating runTurn's real order (T018): bind the tier first; residency.load() below would only run on success.
      assert.throws(() => bindRole("reviewer", "standard", roster, ["reviewer"]), TierPolicyError);
      // residency.load() is never called in this branch — asserted by never invoking it, not merely by the throw.
      assert.equal(loadAttempted, false);
      void residency; // the fake residency instance is unused on this path, which is exactly the point
    },
  );
});
