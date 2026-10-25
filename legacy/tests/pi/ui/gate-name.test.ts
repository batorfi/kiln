// kiln/tests/pi/ui/gate-name.test.ts — T003 (Foundational), r9 · research D3 · data-model E1 · OFFLINE tier.
// `GATE_NAME`/`gateName()` are an ADDITIVE export on `move-vocabulary.ts` (the r1-owned, canonical contract file) — this pins that nothing
// existing in the module moved, alongside the new behaviour.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as moveVocabulary from "../../../contracts/move-vocabulary.ts";
import { gateName, GATE_NAME, type GateId } from "../../../contracts/move-vocabulary.ts";

const ALL_GATE_IDS: GateId[] = ["gate0", 1, 2, 3, 4, 5, 6, 7, 8, 9];

test("gateName(3) === 'spec'", () => {
  assert.equal(gateName(3), "spec");
});

test("gateName('gate0') === 'gate0' (no numeric form to replace)", () => {
  assert.equal(gateName("gate0"), "gate0");
});

test("gateName covers EVERY GateId r1 declares, with no undefined result", () => {
  for (const id of ALL_GATE_IDS) {
    const name = gateName(id);
    assert.equal(typeof name, "string", `gateName(${String(id)}) must be a string`);
    assert.notEqual(name, undefined, `gateName(${String(id)}) must not be undefined`);
    assert.notEqual(name.length, 0, `gateName(${String(id)}) must not be empty`);
  }
});

test("gateName's human names match research D3's table exactly", () => {
  assert.equal(gateName(1), "concept");
  assert.equal(gateName(2), "architecture");
  assert.equal(gateName(3), "spec");
  assert.equal(gateName(4), "plan");
  assert.equal(gateName(5), "checkpoint");
  assert.equal(gateName(6), "review");
  assert.equal(gateName(7), "verification");
  assert.equal(gateName(8), "docs");
  assert.equal(gateName(9), "pull request");
});

test("GATE_NAME has EXACTLY the GateId keys, no more, no fewer", () => {
  const keys = new Set(Object.keys(GATE_NAME));
  const expectedKeys = new Set(ALL_GATE_IDS.map(String));
  assert.deepEqual(keys, expectedKeys);
});

// ── the "untouched" half: MOVE_VOCABULARY, GATE_TO_KEY (private, so checked via moveVocabulary()) and every other
// existing export of move-vocabulary.ts are a SNAPSHOT before/after this task's own diff — pinned here as the module's
// own export surface plus its behaviour, so a future edit that accidentally rewrites something existing is caught.
const PRE_EXISTING_EXPORTS = [
  "GATE_RAIL", "PROGRAM_GATE", "MOVE_VOCABULARY", "MITIGATION_CAP", "moveVocabulary", "moveAllowed",
  "gateIsProgramGate", "CHECKPOINT_GATE", "REVIEW_GATE", "VERIFICATION_GATE",
] as const;

test("every pre-existing export of move-vocabulary.ts is still present, unchanged in behaviour", () => {
  const names = Object.keys(moveVocabulary);
  for (const n of PRE_EXISTING_EXPORTS) assert.ok(names.includes(n), `missing pre-existing export: ${n}`);
  assert.deepEqual(moveVocabulary.MOVE_VOCABULARY.gate0, ["approve", "revise", "reject", "edit-rows", "add-row", "drop-row"]);
  assert.equal(moveVocabulary.MITIGATION_CAP, 2);
  assert.deepEqual(moveVocabulary.GATE_RAIL, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("move-vocabulary.ts adds EXACTLY GATE_NAME and gateName on top of the pre-existing surface", () => {
  const names = new Set(Object.keys(moveVocabulary));
  const extra = [...names].filter((n) => !(PRE_EXISTING_EXPORTS as readonly string[]).includes(n) && n !== "GATE_NAME" && n !== "gateName");
  assert.deepEqual(extra, [], `unexpected export(s) beyond GATE_NAME/gateName: ${extra.join(", ")}`);
});
