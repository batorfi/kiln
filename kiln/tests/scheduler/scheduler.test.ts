// kiln/tests/scheduler/scheduler.test.ts — T018/T019 (US4): the affinity scheduler + strongest LoD.
import { test } from "node:test";
import assert from "node:assert/strict";
import { switchCount, schedule, lodUnitsBoundStrongest } from "../../src/scheduler.ts";
import { makeStubResident, type WorkUnit } from "../../src/stub-resident.ts";

const W = (id: string, role: WorkUnit["role"], tier: WorkUnit["tier"]): WorkUnit => ({ id, role, tier, out: `${id}-ok` });

test("US4 SC-004 (F-AFFINITY): all-same-tier ⇒ switches = 0; one boundary ⇒ switches = 1", () => {
  const same = [W("a", "concept-writer", "strongest"), W("b", "worker", "strongest"), W("c", "techwriter", "strongest")];
  assert.equal(switchCount(same), 0, "an affinity-compatible interior boundary swaps 0");
  const oneBoundary = [W("a", "concept-writer", "strongest"), W("b", "worker", "strongest"), W("c", "techwriter", "standard")];
  assert.equal(switchCount(oneBoundary), 1, "one genuine tier boundary swaps 1");
   // The "no swap on an affinity-compatible boundary" probe: two adjacent same-tier units ⇒ 0.
  assert.equal(switchCount([W("x", "worker", "standard"), W("y", "techwriter", "standard")]), 0, "counter is not inflated");
});

test("US4: the lane's realized switches agree with switchCount (T021)", () => {
  const units = [W("a", "concept-writer", "strongest"), W("b", "techwriter", "standard"), W("c", "worker", "standard"), W("d", "adr-maker", "cheap")];
  const resident = makeStubResident({ model: "stub", tier: "strongest" });
  const result = schedule(units, resident);
  assert.equal(result.switches, switchCount(units), "the scheduler's realized switch count is the minimum the tier sequence requires");
  assert.equal(result.costs.length, switchCount(units), "each genuine boundary is bracketed by a cost record");
});

test("US4 (P-II / G2): the four line-of-defense roles bind strongest and a weaker binding is REJECTED at schedule time", () => {
  const lod = [
     W("critic", "architecture-critic", "strongest"),
     W("verifier", "verifier", "strongest"),
     W("reviewer", "code-reviewer", "strongest"),
     W("docs", "docs-synthesizer", "strongest"),
    ] as WorkUnit[];
  assert.ok(lodUnitsBoundStrongest(lod), "the four LoD units bind strongest");
  const resident = makeStubResident({ model: "stub", tier: "strongest" });
  assert.doesNotThrow(() => schedule(lod, resident), "a strongest LoD binding is accepted");

    // A weaker LoD binding is rejected AT SCHEDULE TIME (P-II / G2 / L1).
  const weaker = lod.map((u) => ({ ...u, tier: "standard" as WorkUnit["tier"] }));
  for (const weak of weaker) {
    assert.throws(() => schedule([weak], resident), /G2|strongest|line-of-defense/i, `${weak.role} on a sub-strongest tier is a config error`);
   }
});
