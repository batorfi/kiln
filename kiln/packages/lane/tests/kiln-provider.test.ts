// r16 T012 — requestThroughLane: a caller already holding its lease is never asked to acquire a second one; a tier
// mismatch goes through the existing acquire() path unmodified; a refusal happens before `call()` ever runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createKilnProvider } from "#lane/kiln-provider.ts";
import type { LaneApi, Lease } from "#durable/types.ts";

/** A minimal fake LaneApi: records every acquire() call, lets the test script whether a step holds and whether acquire succeeds. */
function fakeLane(opts: { heldBy?: number; acquireRejects?: Error } = {}) {
  const acquireCalls: Array<{ step: number; model?: string }> = [];
  const lane: LaneApi = {
    async acquire(step, acquireOpts) {
      acquireCalls.push({ step, model: acquireOpts?.model });
      if (opts.acquireRejects) throw opts.acquireRejects;
      return { holder: step, since: Date.now() } satisfies Lease;
    },
    async release() {},
    holds(step) {
      return step === opts.heldBy;
    },
  };
  return { lane, acquireCalls };
}

test("a step that already holds the lease is not re-acquired; call() runs directly", async () => {
  const { lane, acquireCalls } = fakeLane({ heldBy: 1 });
  const provider = createKilnProvider(lane);
  let called = false;
  const result = await provider.requestThroughLane({ step: 1, model: "m1", call: async () => { called = true; return "ok"; } });
  assert.equal(result, "ok");
  assert.equal(called, true);
  assert.deepEqual(acquireCalls, [], "already holding the lease: acquire() must not be called at all");
});

test("a step that does not hold the lease goes through acquire() exactly once, with the requested model", async () => {
  const { lane, acquireCalls } = fakeLane({ heldBy: 99 }); // held by someone else / not yet held
  const provider = createKilnProvider(lane);
  const result = await provider.requestThroughLane({ step: 2, model: "m2", call: async () => "done" });
  assert.equal(result, "done");
  assert.deepEqual(acquireCalls, [{ step: 2, model: "m2" }]);
});

test("a refused acquire (the model cannot be made resident) propagates before call() ever runs", async () => {
  const refusal = new Error("the model cannot be made resident");
  const { lane } = fakeLane({ heldBy: -1, acquireRejects: refusal });
  const provider = createKilnProvider(lane);
  let called = false;
  await assert.rejects(
    provider.requestThroughLane({ step: 3, model: "unavailable-model", call: async () => { called = true; return "never"; } }),
    (e: unknown) => e === refusal,
  );
  assert.equal(called, false, "call() must never run when the lease could not be acquired");
});

test("a LaneApi with no holds() at all falls back to always acquiring (optional method, never required)", async () => {
  const acquireCalls: unknown[] = [];
  const lane: LaneApi = {
    async acquire(step, opts) { acquireCalls.push({ step, model: opts?.model }); return { holder: step, since: 0 }; },
    async release() {},
    // holds intentionally omitted
  };
  const provider = createKilnProvider(lane);
  await provider.requestThroughLane({ step: 4, model: "m4", call: async () => "x" });
  assert.deepEqual(acquireCalls, [{ step: 4, model: "m4" }]);
});

// ── T030 (US3 acceptance): the harness's own housekeeping shares a step's held lease, never a second acquire ──
// LANE-3's own wording: "Every model request, including harness-internal ones (compaction), ... holds the lane
// lease". A unit's real generation (step 5) already acquired the lease via requestThroughLane; a SEPARATE,
// synthetic call standing in for harness housekeeping (same step id — housekeeping acts ON BEHALF OF the step that
// is currently running, it is not a step of its own) must see holds()===true and never acquire again.

test("housekeeping (a second requestThroughLane for the SAME already-held step) never acquires a second lease", async () => {
  const { lane, acquireCalls } = fakeLane({ heldBy: 5 });
  const provider = createKilnProvider(lane);

  const generation = await provider.requestThroughLane({ step: 5, model: "worker-model", call: async () => "generation result" });
  const housekeeping = await provider.requestThroughLane({ step: 5, model: "worker-model", call: async () => "compaction result" });

  assert.equal(generation, "generation result");
  assert.equal(housekeeping, "compaction result");
  assert.deepEqual(acquireCalls, [], "neither the real generation nor the housekeeping call behind it acquired a second lease — both share the one the step already holds");
});
