// kiln/tests/lane/lane.test.ts — T005/T006 (US1): the single lane (F-SINGLE, SC-001 / P-III).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeLane,
  run,
  assertSingleLane,
  hasSwapTransition,
  type Lane,
} from "../../src/lane.ts";
import { makeStubResident, type WorkUnit } from "../../src/stub-resident.ts";

function unit(id: string, tier: WorkUnit["tier"]): WorkUnit {
  return { id, role: tier === "strongest" ? "architecture-critic" : "worker", tier, out: `done-${id}-${tier}` };
}

test("US1 SC-1: a 2-unit same-tier lane holds exactly one resident + one running unit", async () => {
  const lane = makeLane();
  const resident = makeStubResident({ model: "stub", tier: "strongest" });
  const result = await run(lane, [unit("A", "strongest"), unit("B", "strongest")], resident);
  // F-SINGLE over every captured snapshot.
  assert.doesNotThrow(() => assertSingleLane(result.snapshots), "a single-lane walk must never be a foundry");
   // Exactly one resident resident at every instant.
  for (const s of result.snapshots) assert.ok(s.resident, "a resident is held at every instant");
  // Each `yield` is followed by a reclaim (`running === null`) before the next yield (US1 AC-1/AC-2).
  let yields = 0;
  let reclaims = 0;
  for (const t of result.transitions) if (t.kind === "yield") yields += 1;
  for (let i = 0; i < result.snapshots.length - 1; i++) {
    if (result.snapshots[i].running && result.snapshots[i + 1].running === null) reclaims += 1;
  }
  assert.equal(yields, 2, "one yield per unit");
  assert.ok(reclaims >= 2, "each unit is reclaimed before the next runs");
});

test("US1 SC-4: a same-tier 2-unit walk incurs ZERO switches (F-AFFINITY preview, SC-004)", async () => {
  const lane = makeLane();
  const resident = makeStubResident({ model: "stub", tier: "strongest" });
  const result = await run(lane, [unit("A", "strongest"), unit("B", "strongest"), unit("C", "strongest")], resident);
  assert.equal(result.switches, 0, "no swap on an affinity-compatible interior boundary");
  assert.equal(result.costs.length, 0, "no cost bracketing a non-existent swap");
  assert.equal(hasSwapTransition(result.transitions), false, "a same-tier walk emits no swap transition");
});

test("US1: a single tier change lands exactly one swap + a bracketing cost", async () => {
  const lane = makeLane();
  const resident = makeStubResident({ model: "stub", tier: "strongest" });
  const result = await run(lane, [unit("A", "strongest"), unit("B", "standard"), unit("C", "standard")], resident);
  assert.equal(result.switches, 1, "one genuine tier boundary ⇒ one swap");
  assert.equal(result.costs.length, 1, "a cost brackets the swap");
  assert.equal(result.costs[0].switches, 1, "the cost carries the switch count");
  assert.doesNotThrow(() => assertSingleLane(result.snapshots));
});

test("US1 negative: assertSingleLane throws on a two-running-at-once 'foundry' snapshot", () => {
  const forged: Lane[] = [
     { resident: { model: "m", tier: "strongest" }, running: { duId: "A", role: "worker" }, queue: [], switches: 0, wallClock: "00:00", roadmap: [], current: "", gate0: { status: "pending" }, gate: null as unknown as null },
     { resident: { model: "m", tier: "strongest" }, running: { duId: "B", role: "worker" }, queue: [], switches: 0, wallClock: "00:00", roadmap: [], current: "", gate0: { status: "pending" }, gate: null as unknown as null },
   ];
  assert.throws(() => assertSingleLane(forged), /foundry/, "two different running units with no reclaim must be detected");
});
