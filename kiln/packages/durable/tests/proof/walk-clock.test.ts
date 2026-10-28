// r14 T055 (US3, DEFAULT tier): no clock settles a walk gate. The owner's clock is set ten years ahead and ten years behind; a gate left waiting while real time passes is still waiting, with NO timer anywhere
// on it; and a whole walk under a skewed clock is the same walk — `decidedAt` is the injected clock's reading, a fact recorded and never a trigger.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkInvariants } from "./support/oracle.ts";
import { runWalk } from "./support/walk-harness.ts";
import { baseline, FEATURE, INTERFACE, judge } from "./support/walk-judge.ts";

const TEN_YEARS = 10 * 365 * 24 * 3600 * 1000;

for (const [label, offset] of [["+10 years", TEN_YEARS], ["−10 years", -TEN_YEARS]] as const) {
  test(`clock ${label}: a gate left waiting while real time passes is still waiting, with no timer`, { timeout: 60_000 }, async () => {
    const run = await runWalk({ feature: FEATURE, walk: INTERFACE, owner: { clockOffsetMs: offset }, stopAfter: 0, holdMs: 1500 });
    try {
      const i = run.inspection;
      assert.equal(run.steps.length, 0, "nobody decided");
      const gateId = `gate:${FEATURE}:gate0:1`;
      assert.equal(run.view.openGate?.gateId, gateId);
      const gi = (await import("#durable/inspect.ts")).inspectStore;
      const g = await gi(run.ts.store, gateId);
      assert.equal(g.gate, "waiting");
      assert.deepEqual(g.records, []);
      assert.deepEqual(g.timers, []);
      assert.deepEqual(checkInvariants(g), []);
      const opened = i.outbox.find((e) => e.type === "gate.opened")!;
      assert.ok(Math.abs(opened.at - (Date.now() + offset)) < 60_000, "gate.opened carries the injected clock's reading");
    } finally {
      run.cleanup();
    }
  });

  test(`clock ${label}: the whole walk under a skewed clock equals the walk under the real one (the clock is recorded, never a trigger)`, { timeout: 120_000 }, async () => {
    const base = await baseline("interface", INTERFACE);
    const run = await runWalk({ feature: FEATURE, walk: INTERFACE, owner: { clockOffsetMs: offset } });
    try {
      await judge(run, INTERFACE, base);
      const moves = run.inspection.outbox.filter((e) => e.type === "move.committed");
      assert.equal(moves.length, 12);
      assert.ok(moves.every((e) => Math.abs(e.at - (Date.now() + offset)) < 120_000), "every decision's time is the injected clock's reading");
    } finally {
      run.cleanup();
    }
  });
}
