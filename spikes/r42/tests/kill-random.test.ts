// T032 — randomised external kills: SUPPORTING evidence. A named point cannot reach INSIDE the store's own commit; a kill at a random instant can.
// It can condemn (a violation counts) but never acquit (see status.ts). The delays come from a SEEDED generator, and the seed is reported.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomDelays, runRandomKillScenarios } from "../src/scenarios/random-kill.ts";
import { loadStrategy } from "../src/strategy.ts";

test("RK1 the delay sequence is a pure function of the seed (a failing trial can be replayed) and spans the move's window", () => {
  assert.deepEqual(randomDelays(42, 20), randomDelays(42, 20));
  assert.notDeepEqual(randomDelays(42, 20), randomDelays(43, 20));
  const d = randomDelays(7, 500);
  assert.ok(d.every((x) => x >= 0 && x <= 8), "delays stay inside the 0–8 ms window in which a move is in flight");
  assert.ok(Math.min(...d) < 1 && Math.max(...d) > 6, "and cover it");
});

test("RK2 the correct control survives 100 random kills: every trial's store satisfies the invariants, before and after a restart", async () => {
  const s = await loadStrategy("control-sqlite");
  const results = await runRandomKillScenarios(s, { trials: 100, seed: 1 });
  assert.deepEqual(new Set(results.map((r) => r.guarantee)), new Set(["a", "e"]));
  for (const r of results) {
    assert.equal(r.kind, "random-kill");
    assert.equal(r.supporting, true, "random kills are supporting evidence");
    assert.equal(r.ran, true, r.detail);
    assert.equal(r.passed, true, `${r.violated} ${r.detail}`);
    assert.equal(r.counts!.trials, 100);
    assert.equal(r.counts!.violations, 0);
    assert.equal(r.counts!.settled + r.counts!.waiting, 100, "every trial ends in one of the two legitimate states");
  }
  assert.match(results[0].detail ?? "", /seed 1/, "the seed is reported");
});

test("RK3 the harness tallies the broken control without crashing (a violation, if the kill lands in the seam, counts against it)", async () => {
  const s = await loadStrategy("broken-two-commit");
  const results = await runRandomKillScenarios(s, { trials: 40, seed: 3 });
  for (const r of results) {
    assert.equal(r.ran, true);
    assert.equal(r.counts!.trials, 40);
    assert.equal(r.passed, r.counts!.violations === 0, "passed exactly when no trial violated an invariant");
  }
});
