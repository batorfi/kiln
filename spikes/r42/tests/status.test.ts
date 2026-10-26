// T020 — the status rules (contracts/spike-report.md §2). A guarantee is HELD only by scenarios that RAN and passed; a missing scenario is never a pass.
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveStatus, summarizeGuarantee } from "../src/status.ts";
import type { ScenarioResult } from "../src/evidence-model.ts";

const r = (over: Partial<ScenarioResult> = {}): ScenarioResult => ({ scenario: "kill-point:x", kind: "kill-point", guarantee: "a", strategy: "s", ran: true, passed: true, violated: [], ...over });
const many = (n: number, over: Partial<ScenarioResult> = {}) => Array.from({ length: n }, (_, i) => r({ scenario: `kill-point:p${i}`, ...over }));

test("S1 every scenario ran and passed (and there is at least one) ⇒ held", () => {
  assert.equal(deriveStatus([r()]), "held");
  assert.equal(deriveStatus(many(12)), "held");
});

test("S2 no scenario at all ⇒ not-proven, NEVER held", () => {
  assert.equal(deriveStatus([]), "not-proven");
});

test("S3 one scenario that did not run spoils an otherwise perfect record: 100 passes + 1 ran:false ⇒ not-proven", () => {
  assert.equal(deriveStatus([...many(100), r({ scenario: "kill-point:cut", ran: false, passed: false })]), "not-proven");
});

test("S4 a scenario that ran and violated an invariant ⇒ not-held — even beside scenarios that did not run (a violation beats missing evidence)", () => {
  assert.equal(deriveStatus([r({ passed: false, violated: ["I3"] })]), "not-held");
  assert.equal(deriveStatus([r({ passed: false, violated: ["I3"] }), r({ scenario: "kill-point:cut", ran: false, passed: false })]), "not-held");
});

test("S5 a strategy that declared ZERO kill points proves nothing about the guarantees they would test ⇒ not-proven", () => {
  assert.equal(deriveStatus(many(5), { declaredKillPoints: 0 }), "not-proven");
  assert.equal(deriveStatus(many(5), { declaredKillPoints: 6 }), "held");
});

test("S6 supporting evidence (random kills) can show a violation but can never be what makes a guarantee held", () => {
  const supporting = (over: Partial<ScenarioResult> = {}) => r({ kind: "random-kill", scenario: "random-kill:300", supporting: true, ...over });
  assert.equal(deriveStatus([supporting()]), "not-proven", "300 random kills alone are not a proof");
  assert.equal(deriveStatus([supporting(), r()]), "held", "random kills beside a passing enumerated scenario");
  assert.equal(deriveStatus([supporting({ passed: false, violated: ["I3"] }), r()]), "not-held", "a violation found by random kills still counts against the guarantee");
});

test("S7 summarizeGuarantee reports the counts and the union of violated invariants, sorted", () => {
  const s = summarizeGuarantee([r(), r({ scenario: "k2", passed: false, violated: ["I3", "I1"] }), r({ scenario: "k3", ran: false, passed: false })]);
  assert.deepEqual(s, { status: "not-held", scenarios: 3, ran: 2, passed: 1, violated: ["I1", "I3"] });
});
