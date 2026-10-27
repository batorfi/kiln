// r14 T025: `WalkInput` validation, by name, before anything is written — and the walk refuses to start on a flow the check would refuse (FR-054).
import { test } from "node:test";
import assert from "node:assert/strict";
import { flowOf } from "#contracts/flow/index.ts";
import { checkWalk } from "#durable/walk/input.ts";
import { checkRow } from "#durable/tasks/validate.ts";
import { INTERFACE, withFactory } from "./support.ts";

const ok = { ...INTERFACE };
const bad = (over: Record<string, unknown>) => checkWalk({ ...ok, ...over });

test("a well-formed walk input passes", () => {
  assert.equal(checkWalk(ok), null);
  assert.equal(checkWalk({ flow: "v2", facts: {} }), null, "facts may be empty: absent facts read as false");
  assert.equal(checkWalk({ ...ok, triage: { skip: true, reasoning: "a one-line change" }, verifier: ["fail", "pass"], script: { sameContent: ["3-spec"], stepMs: 5 } }), null);
});

test("each mistake is refused by name", () => {
  assert.match(bad({ flow: "v1" })!, /walk\.flow must be "v2".*never walked under v2/);
  assert.match(bad({ flow: undefined })!, /walk\.flow must be "v2"/);
  assert.match(bad({ extra: 1 })!, /unknown field: extra/);
  assert.match(bad({ facts: "x" })!, /walk\.facts is an object/);
  assert.match(bad({ facts: { paths: "web/**" } })!, /walk\.facts\.paths is a list of strings/);
  assert.match(bad({ facts: { colour: [] } })!, /walk\.facts: unknown field: colour/);
  assert.match(bad({ built: { ui_files_changed: "yes" } })!, /walk\.built\.ui_files_changed is true or false/);
  assert.match(bad({ built: { elsewhere: true } })!, /walk\.built: unknown field/);
  assert.match(bad({ triage: { skip: "yes", reasoning: "x" } })!, /triage\.skip is true or false/);
  assert.match(bad({ triage: { skip: true, reasoning: "  " } })!, /reasoning is required when triage skips/);
  assert.match(bad({ verifier: ["pass", "maybe"] })!, /each pass or fail/);
  assert.match(bad({ script: { sameContent: ["nope"] } })!, /list of gate keys/);
  assert.match(bad({ script: { stepMs: -1 } })!, /stepMs is an integer from 0 to 60000/);
  assert.match(checkWalk("x")!, /an object/);
});

test("a row has a script OR a walk, not both and not neither; a walk's feature name fits the gate-id pattern", () => {
  assert.match(checkRow({ feature: "f", script: [], walk: ok })!, /script OR a walk, not both/);
  assert.match(checkRow({ feature: "f" })!, /script is a list/);
  assert.equal(checkRow({ feature: "f", walk: ok }), null);
  assert.equal(checkRow({ feature: "f", script: [] }), null, "the r13 form is unchanged");
  for (const f of ["F", "a:b", "-a", "a b", ""]) assert.ok(checkRow({ feature: f, walk: ok }), `feature ${JSON.stringify(f)} must be refused`);
});

test("tasks.create refuses with nothing written; the same walk then creates once (keyed)", () => withFactory(async (f) => {
  const r = await f.walks.admit("k1", "f", { ...ok, flow: "v1" } as never);
  assert.equal(r.status, "refused");
  assert.equal((await f.tasks.list()).length, 0, "nothing was written");
  assert.equal((await f.walks.admit("k2", "f", ok)).status, "created");
  assert.equal((await f.walks.admit("k2", "f", ok)).status, "repeat");
  assert.equal((await f.walks.admit("k2", "f", { ...ok, built: {} })).status, "refused", "the same key with another walk is a key-conflict");
  assert.equal((await f.tasks.list()).filter((t) => t.kind === "kiln.row").length, 1);
}));

test("FR-054: a walk does not start on a flow `kiln check flow` would refuse — the refusal names the fault's code", () => {
  const v2 = flowOf("v2");
  const merge = v2.gates.pop()!;
  try {
    const why = checkWalk(ok);
    assert.match(why!, /the flow is invalid, so no walk starts on it: .*flow-anchor-last/);
  } finally {
    v2.gates.push(merge);
  }
  assert.equal(checkWalk(ok), null, "restored");
});
