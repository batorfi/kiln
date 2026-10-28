// r14 T056 (US3, DEFAULT tier): the proof is shown able to FAIL. A deliberately WEAKENED walk — a row that moves on without a person, treating the absence of a move as an approval — runs against the same
// harness, script and judge as the real one; the judge must reject it BY NAME (W1: a gate opened while the one before it was never settled). The real walk passes the same judge. And a kill that never fires fails
// by name (`proof-point-not-fired`), so a proof that killed nothing cannot pass.
import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants } from "./support/oracle.ts";
import { runWalk } from "./support/walk-harness.ts";
import { baseline, FEATURE, judge, killRun, PLAIN } from "./support/walk-judge.ts";
import { checkWalkInvariants, walkGateIds } from "./support/walk-oracle.ts";

test("the real walk passes the judge; the weakened walk is rejected by name — W1 (and the gate invariants) — at its own seam", { timeout: 120_000 }, async () => {
  const base = await baseline("plain", PLAIN);
  const real = await runWalk({ feature: FEATURE, walk: PLAIN });
  try {
    await judge(real, PLAIN, base);
  } finally {
    real.cleanup();
  }

  const weak = await runWalk({ feature: FEATURE, walk: PLAIN, owner: { brokenWalk: true }, maxMs: 30_000 });
  try {
    const w = checkWalkInvariants(weak.inspection, { feature: FEATURE, facts: PLAIN.facts });
    assert.ok(w.includes("W1"), `the weakened walk must violate W1 (a gate opened while the one before it was never settled); the judge said ${JSON.stringify(w)}`);
    // …and at the level of a single gate: some gate it opened was never settled by a move
    let unsettled = 0;
    for (const g of walkGateIds(weak.inspection, FEATURE)) {
      const gi = await inspectStore(weak.ts.store, g);
      if (gi.records.length === 0) unsettled++;
      assert.deepEqual(checkInvariants(gi).filter((v) => v === "I4"), [], "the weakened walk is not caught for the wrong reason");
    }
    assert.ok(unsettled >= 1, "at least one gate was passed without a move");
    await assert.rejects(judge(weak, PLAIN, base), /walk invariants|walk equality|ended settled|exactly one move record/, "the judge rejects the weakened walk");
  } finally {
    weak.cleanup();
  }
});

test("a kill that never fires fails by name: a proof that killed nothing proves nothing", { timeout: 60_000 }, async () => {
  await assert.rejects(killRun("plain", PLAIN, "walk.pin-begin", 99), /proof-point-not-fired: walk\.pin-begin \(hit 99\)/);
});
