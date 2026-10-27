// r14 T019: `validateFlow` is the pure rule set behind `kiln check flow`. The shipped v2 has no fault; a fault names its code, its gate and what is wrong; several faults are all returned;
// the constants the validator holds equal the flow the constitution describes. (The per-rule negative suite lives with the check: checks/tests/flow-check.test.ts.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUILTIN_ORDER, CONDITIONAL, flowOf, order, validateFlow } from "#contracts/flow/index.ts";
import type { FlowDefinition } from "#contracts/flow/types.ts";

const fresh = (): FlowDefinition => JSON.parse(JSON.stringify(flowOf("v2"))) as FlowDefinition;

test("the shipped v2 has no fault", () => {
  assert.deepEqual(validateFlow(flowOf("v2")), []);
});

test("the validator's built-in order IS the shipped flow's order, and its conditional gates are the two with applies_when", () => {
  assert.deepEqual([...BUILTIN_ORDER], order(flowOf("v2")));
  assert.deepEqual(Object.keys(CONDITIONAL).sort(), flowOf("v2").gates.filter((g) => g.appliesWhen).map((g) => g.key).sort());
});

test("a fault carries a stable code, the gate and a sentence that says what is wrong", () => {
  const d = fresh();
  d.gates.find((g) => g.key === "6-review")!.judge = "worker";
  const faults = validateFlow(d);
  assert.equal(faults.length, 1);
  assert.equal(faults[0].code, "flow-judge-not-judge");
  assert.equal(faults[0].gate, "6-review");
  assert.match(faults[0].detail, /"worker" is a producer role, not a judge/);
});

test("several faults are all returned, in the order the rules run (no early exit)", () => {
  const d = fresh();
  d.gates = d.gates.filter((g) => g.key !== "9-pr" && g.key !== "4-plan");
  d.gates.find((g) => g.key === "2-architecture")!.judge = "ghost";
  const codes = validateFlow(d).map((f) => f.code);
  for (const c of ["flow-anchor-last", "flow-builtin-missing", "flow-role-unknown"]) assert.ok(codes.includes(c), `${c} in ${codes.join(",")}`);
  assert.equal(codes.filter((c) => c === "flow-builtin-missing").length, 2, "one per missing gate");
});

test("a flow that is not even an object with gates is refused, not crashed on", () => {
  assert.deepEqual(validateFlow({ version: "v2", gates: [], roster: { version: "v2", judges: [], producers: [] } }).map((f) => f.code), ["flow-vacuous"]);
  assert.ok(validateFlow({ version: "v9", gates: [], roster: { version: "v2", judges: [], producers: [] } } as never).some((f) => f.code === "flow-version"));
});
