// The pure affinity logic (r12 T030). Three new cases, from an in-test list of units: no resident, no lane.
import { test } from "node:test";
import assert from "node:assert/strict";
import { switchCount, bindAll, judgeUnitsBoundStrongest } from "#lane/affinity.ts";
import type { WorkUnit } from "#lane/types.ts";
import { flows } from "#contracts/flow/index.ts";

const roster = flows.v1.roster;
const W = (id: string, role: string, tier: WorkUnit["tier"]): WorkUnit => ({ id, role, tier });

test("a same-tier boundary counts 0 swaps", () => {
  const units = [W("a", "worker", "standard"), W("b", "techwriter", "standard"), W("c", "pr-writer", "standard")];
  assert.equal(switchCount(units), 0, "an affinity-compatible interior boundary swaps 0");
  assert.equal(switchCount([]), 0);
  assert.equal(switchCount([W("only", "worker", "cheap")]), 0);
});

test("a genuine tier change counts 1 swap, and only the changes count", () => {
  const units = [W("a", "worker", "standard"), W("b", "verifier", "strongest"), W("c", "code-reviewer", "strongest")];
  assert.equal(switchCount(units), 1);
  assert.equal(switchCount([W("a", "worker", "cheap"), W("b", "worker", "standard"), W("c", "worker", "cheap")]), 2);
});

test("a sub-strongest judge binding makes bindAll throw synchronously, before any promise exists", () => {
  const bad = [W("a", "worker", "standard"), W("b", "verifier", "standard")];
  const result: unknown = (() => {
    assert.throws(() => bindAll(bad, roster), /G2\/L1 config error/);
    return undefined;
  })();
  assert.equal(result, undefined);
  // not async: calling it returns undefined, never a promise
  assert.equal(bindAll([W("a", "verifier", "strongest")], roster), undefined);
  assert.equal(judgeUnitsBoundStrongest(bad, roster), false);
  assert.equal(judgeUnitsBoundStrongest([W("a", "verifier", "strongest"), W("b", "worker", "cheap")], roster), true);
  // an added-gate judge is held to the same rule
  assert.throws(() => bindAll([W("x", "extra-judge", "cheap")], roster, ["extra-judge"]), /must be "strongest"/);
});
