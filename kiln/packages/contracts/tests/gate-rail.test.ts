// Ported from the first program's tests/contract/gate-rail.test.ts (6 cases, r12 T053): MoveVocabulary(gate), G1 gate0 distinctness, the G5
// special sets. The six cases assert FLOW v1 — the rail they were written for — with their expectations unchanged. New cases follow: flow v2
// (constitution v2.1.0), the F3 equality against the first program's own MOVE_VOCABULARY (read as text), and F10 (gates v1 does not have).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CURRENT_FLOW, DEFAULT_RECORD_FLOW, flowOf, flows, gateName, hasGate, moveAllowed, moveVocabulary,
} from "#contracts/flow/index.ts";
import { GATE_KEY_OF, gateIsProgramGate } from "#contracts/moves.ts";
import type { GateId } from "#contracts/moves.ts";

const CHECKPOINT_GATE: GateId = 5;
const REVIEW_GATE: GateId = 6;
const VERIFICATION_GATE: GateId = 7;
const v1 = (gate: GateId) => moveVocabulary(gate, "v1");

// ── the six ported cases (flow v1) ───────────────────────────────────────────────────────────────────────────────────────────────────
test("G5 checkpoint carries split+revise and NO reject (the grow move)", () => {
  const m = v1(CHECKPOINT_GATE);
  assert.ok(m.includes("split+revise"), "checkpoint must grow");
  assert.ok(!m.includes("reject"), "checkpoint has no reject");
});
test("G5 review is approve/restart — NO revise (judge never authors)  [flow v1]", () => {
  const m = v1(REVIEW_GATE);
  assert.ok(m.includes("restart"), "review must restart");
  assert.ok(!m.includes("revise"), "review must NOT revise");
});
test("G4/G5 verification is approve/reject with mitigation cap 2", () => {
  assert.deepEqual([...v1(VERIFICATION_GATE)].sort(), ["approve", "reject"]);
  assert.deepEqual(flowOf("v1").gates.find((g) => g.key === "7-verification")!.mitigationCap, { default: 2, min: 2, max: 2 });
});
test("G1 gate0 is the program gate, distinct from Gates 1..9", () => {
  assert.ok(gateIsProgramGate("gate0"));
  assert.ok(!gateIsProgramGate(1));
  for (const g of [1, 2, 3, 4, 5, 6, 7, 8, 9]) assert.ok(!gateIsProgramGate(g as 1));
});
test("gate0 carries the program-edit moves", () => {
  const m = v1("gate0");
  for (const mv of ["approve", "revise", "reject", "edit-rows", "add-row", "drop-row"]) assert.ok(m.includes(mv), `gate0 missing ${mv}`);
});
test("G3 move membership at standard gates  [flow v1]", () => {
  assert.ok(moveAllowed(1, "revise", "v1"));
  assert.ok(!moveAllowed(6, "revise", "v1"));
  assert.ok(!moveAllowed(5, "reject", "v1"));
  assert.ok(!moveAllowed(7, "revise", "v1"));
});

// ── F3: v1 is the first program's rail, key for key ──────────────────────────────────────────────────────────────────────────────────
test("F3 flow v1's move sets equal the first program's MOVE_VOCABULARY, key for key (read from its text; nothing is imported from legacy)", () => {
  const text = readFileSync(new URL("../../../../legacy/contracts/move-vocabulary.ts", import.meta.url), "utf8");
  const block = /export const MOVE_VOCABULARY[^=]*=\s*\{([\s\S]*?)\n\};/.exec(text);
  assert.ok(block, "the MOVE_VOCABULARY literal was not found in the legacy file — the test refuses to pass without it");
  const legacy = new Map<string, string[]>();
  for (const m of block[1].matchAll(/^\s*"?([\w-]+)"?:\s*\[([^\]]*)\]/gm)) legacy.set(m[1], [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
  assert.equal(legacy.size, 10, "the legacy rail has ten gates");
  const data = new Map(flowOf("v1").gates.map((g) => [g.key, [...g.moves]]));
  assert.deepEqual([...data.keys()].sort(), [...legacy.keys()].sort());
  for (const [key, moves] of legacy) assert.deepEqual(data.get(key as never), moves, `v1 ${key}`);
  // names too
  const names = /export const GATE_NAME[^=]*=\s*\{([\s\S]*?)\n\};/.exec(text);
  assert.ok(names, "the legacy GATE_NAME literal was not found");
  for (const m of names[1].matchAll(/^\s*"?(gate0|\d)"?:\s*"([^"]+)"/gm)) {
    const id: GateId = m[1] === "gate0" ? "gate0" : (Number(m[1]) as GateId);
    assert.equal(gateName(id, "v1"), m[2], `v1 name of gate ${m[1]}`);
  }
});

// ── flow v2 (constitution v2.1.0) ────────────────────────────────────────────────────────────────────────────────────────────────────
test("v2: Code review is approve · revise · restart (constitution v2.0.1: revise goes to the workers)", () => {
  assert.deepEqual([...moveVocabulary(REVIEW_GATE, "v2")], ["approve", "revise", "restart"]);
  assert.ok(moveAllowed(6, "revise", "v2"));
});
test("v2: the Experience design and UI review gates carry their own sets (constitution v2.1.0; ui-flow.md §4.4, §5.4)", () => {
  assert.deepEqual([...moveVocabulary("2a", "v2")], ["approve", "revise", "reject"]);
  assert.deepEqual([...moveVocabulary("6a", "v2")], ["approve", "revise", "restart"]);
  assert.ok(!moveAllowed("2a", "restart", "v2"));
  assert.ok(!moveAllowed("6a", "reject", "v2"));
});
test("v2: the G3 membership rules that did not change still hold", () => {
  assert.ok(!moveAllowed(5, "reject", "v2"));
  assert.ok(!moveAllowed(7, "revise", "v2"));
  assert.ok(moveAllowed(5, "split+revise", "v2"));
  assert.deepEqual([...moveVocabulary(VERIFICATION_GATE, "v2")], ["approve", "reject"]);
  assert.deepEqual(flowOf("v2").gates.find((g) => g.key === "7-verification")!.mitigationCap, { default: 2, min: 0, max: 3 });
});
test("v2 has twelve gates in order and every one maps to a gate id; v1 has ten", () => {
  assert.equal(flowOf("v2").gates.length, 12);
  assert.equal(flowOf("v1").gates.length, 10);
  const ids: GateId[] = ["gate0", 1, 2, "2a", 3, 4, 5, 6, "6a", 7, 8, 9];
  assert.deepEqual(flowOf("v2").gates.map((g) => g.key), ids.map((i) => GATE_KEY_OF[i]));
  assert.equal(Object.keys(GATE_KEY_OF).length, 12);
  assert.equal(gateName(2, "v2"), "Architecture");
  assert.equal(gateName(2, "v1"), "architecture");
});
test("v2's gates contain v1's and its move sets contain v1's (so the first program's walks pass both)", () => {
  for (const g1 of flowOf("v1").gates) {
    const g2 = flowOf("v2").gates.find((g) => g.key === g1.key);
    assert.ok(g2, `v2 lacks ${g1.key}`);
    for (const m of g1.moves) assert.ok(g2.moves.includes(m), `v2 ${g1.key} lacks ${m}`);
  }
});
test("the default flow of a call is the CURRENT flow (v2); a record that names none is history (v1)", () => {
  assert.equal(CURRENT_FLOW, "v2");
  assert.equal(DEFAULT_RECORD_FLOW, "v1");
  assert.deepEqual(moveVocabulary(6), moveVocabulary(6, "v2"));
  assert.ok(moveAllowed(6, "revise"), "no flow argument = the current law");
  assert.deepEqual(Object.keys(flows), ["v1", "v2"]);
});

// ── F10: gates a flow does not have ──────────────────────────────────────────────────────────────────────────────────────────────────
test("F10 flow v1 does not have the interface gates: hasGate and moveAllowed are false, moveVocabulary and gateName throw by name", () => {
  for (const gate of ["2a", "6a"] as const) {
    assert.equal(hasGate(gate, "v1"), false);
    assert.equal(hasGate(gate, "v2"), true);
    assert.equal(moveAllowed(gate, "approve", "v1"), false);
    assert.throws(() => moveVocabulary(gate, "v1"), /no gate .* in flow v1/);
    assert.throws(() => gateName(gate, "v1"), /no gate .* in flow v1/);
  }
  assert.equal(hasGate(6, "v1"), true);
});
test("an id that is no gate, and a flow that does not exist, fail by name — prototype names included", () => {
  assert.throws(() => moveVocabulary(10 as GateId, "v1"), /unknown gate id: 10/);
  assert.throws(() => hasGate("toString" as GateId, "v2"), /unknown gate id/);
  for (const bad of ["v3", "toString", "constructor", "__proto__"]) assert.throws(() => flowOf(bad as never), /unknown flow/);
});
