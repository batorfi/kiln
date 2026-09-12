// kiln/tests/contract/gate-rail.test.ts — T018 (US3)
// MoveVocabulary(gate) + G1/gate-vs-gate0 distinctness + G5 special sets.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  moveVocabulary,
  moveAllowed,
  gateIsProgramGate,
  CHECKPOINT_GATE,
  REVIEW_GATE,
  VERIFICATION_GATE,
} from "../../contracts/move-vocabulary.ts";

test("G5 checkpoint carries split+revise and NO reject (the grow move)", () => {
  const m = moveVocabulary(CHECKPOINT_GATE);
  assert.ok(m.includes("split+revise"), "checkpoint must grow");
  assert.ok(!m.includes("reject"), "checkpoint has no reject");
});
test("G5 review is approve/restart — NO revise (judge never authors)", () => {
  const m = moveVocabulary(REVIEW_GATE);
  assert.ok(m.includes("restart"), "review must restart");
  assert.ok(!m.includes("revise"), "review must NOT revise");
});
test("G4/G5 verification is approve/reject with mitigation cap 2", () => {
  assert.deepEqual([...moveVocabulary(VERIFICATION_GATE)].sort(), ["approve", "reject"]);
});
test("G1 gate0 is the program gate, distinct from Gates 1..9", () => {
  assert.ok(gateIsProgramGate("gate0"));
  assert.ok(!gateIsProgramGate(1));
  for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9]) assert.ok(!gateIsProgramGate(g as 1));
});
test("gate0 carries the program-edit moves", () => {
  const m = moveVocabulary("gate0");
  for (const mv of ["approve", "revise", "reject", "edit-rows", "add-row", "drop-row"]) assert.ok(m.includes(mv), `gate0 missing ${mv}`);
});
test("G3 move membership at standard gates", () => {
  assert.ok(moveAllowed(1, "revise"));
  assert.ok(!moveAllowed(6, "revise"));
  assert.ok(!moveAllowed(5, "reject"));
  assert.ok(!moveAllowed(7, "revise"));
});
