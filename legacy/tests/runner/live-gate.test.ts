// kiln/tests/runner/live-gate.test.ts — F-1 (verification finding), DECIDED 2026-09-20: keep as is · OFFLINE tier.
// An explicit `KILN_LIVE=1` opens the live gate UNCONDITIONALLY. The gate never probes the endpoint, so a missing Ollama/model makes the
// gated tests FAIL (named) instead of skipping — the operator asked for the live tier. When the gate is CLOSED (the default) they skip WITH a
// printed reason. This test pins both halves so the decision cannot silently drift into "skip when Ollama is down".
import { test } from "node:test";
import assert from "node:assert/strict";
import { liveEnabled, skipUnlessLive, skipUnlessLiveCost, LIVE_SKIP_REASON, LIVE_COST_SKIP_REASON } from "../_live-gate.ts";

const withEnv = (vars: Record<string, string | undefined>, fn: () => void) => {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  try {
    for (const [k, v] of Object.entries(vars)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
};

test("F-1: gate CLOSED (the default) ⇒ the live tests SKIP, and the skip carries a printed reason", () => {
  withEnv({ KILN_LIVE: undefined, KILN_LIVE_COST: undefined }, () => {
    assert.equal(liveEnabled(), false);
    assert.equal(skipUnlessLive().skip, LIVE_SKIP_REASON);
    assert.match(String(skipUnlessLive().skip), /KILN_LIVE=1/, "the reason says how to enable it");
    assert.equal(skipUnlessLiveCost().skip, LIVE_SKIP_REASON, "the cost test is also closed when the live gate is closed");
  });
});

test("F-1: an EXPLICIT KILN_LIVE=1 ⇒ the gate is OPEN unconditionally — it does not consult the endpoint, so a missing Ollama FAILS the tests (loudly), it does not skip them", () => {
  withEnv({ KILN_LIVE: "1", KILN_LIVE_COST: undefined, OLLAMA_HOST: "127.0.0.1:1" }, () => { // a DEAD endpoint
    assert.equal(liveEnabled(), true);
    const r = skipUnlessLive();
    assert.equal(r.skip, false, "the gate is open even though nothing is listening — the test body will fail, named, when it dials");
    assert.equal(typeof r.skip, "boolean", "and the decision was made synchronously, without any network probe");
  });
});

test("F-1: the cost test stays a SEPARATE opt-in even when the live gate is open — it unloads the model", () => {
  withEnv({ KILN_LIVE: "1", KILN_LIVE_COST: undefined }, () => assert.equal(skipUnlessLiveCost().skip, LIVE_COST_SKIP_REASON));
  withEnv({ KILN_LIVE: "1", KILN_LIVE_COST: "1" }, () => assert.equal(skipUnlessLiveCost().skip, false));
});
