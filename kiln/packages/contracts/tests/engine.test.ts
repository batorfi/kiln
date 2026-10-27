// r14 T008: the engine's core, read off the flow data — order, the next gate, the rules, targets, triage, the cap — and the claim that decides whether "gates as data" is true:
// change the data and the answer changes with no other change (SC-009).
import { test } from "node:test";
import assert from "node:assert/strict";
import { active, cap, gateDef, next, noteRequired, order, rule, targetsOf, triage, triageProposal, NO_PINS } from "#contracts/flow/engine.ts";
import { flowOf } from "#contracts/flow/index.ts";
import type { FlowDefinition } from "#contracts/flow/types.ts";

const v2 = flowOf("v2");
const copy = (): FlowDefinition => structuredClone(v2) as FlowDefinition;
const KEYS = ["gate0", "1-concept", "2-architecture", "2a-experience", "3-spec", "4-plan", "5-checkpoint", "6-review", "6a-ui-review", "7-verification", "8-docs", "9-pr"];

test("order is the constitution's twelve gates; active() drops the Roadmap gate and whatever is pinned away", () => {
  assert.deepEqual(order(v2), KEYS);
  assert.deepEqual(active(v2), KEYS.slice(1));
  assert.deepEqual(active(v2, { notApplicable: ["2a-experience", "6a-ui-review"], skipped: [] }).length, 9);
  assert.deepEqual(active(v2, { notApplicable: ["2a-experience", "6a-ui-review"], skipped: ["1-concept", "2-architecture"] }), ["3-spec", "4-plan", "5-checkpoint", "6-review", "7-verification", "8-docs", "9-pr"]);
});

test("next walks the active gates in order, skipping pinned gates, and ends after Merge", () => {
  const plain = { notApplicable: ["2a-experience", "6a-ui-review"] as const, skipped: [] as const };
  assert.equal(next(v2, NO_PINS, "gate0"), "1-concept");
  assert.equal(next(v2, plain, "2-architecture"), "3-spec", "Experience design is not applicable: there is nothing to open");
  assert.equal(next(v2, plain, "6-review"), "7-verification");
  assert.equal(next(v2, NO_PINS, "6-review"), "6a-ui-review");
  assert.equal(next(v2, NO_PINS, "9-pr"), null, "nothing after Merge");
  assert.throws(() => next(v2, NO_PINS, "nope" as never), /no gate nope/);
});

test("rules: each move of each gate has one, mitigate is the factory's and carries no person's vocabulary entry", () => {
  for (const g of v2.gates) for (const k of g.moves) assert.ok(rule(v2, g.key, k), `${g.key} offers ${k} with no rule`);
  assert.equal(rule(v2, "5-checkpoint", "reject"), undefined, "Implementation has no reject");
  assert.equal(rule(v2, "6-review", "reject"), undefined, "Code review is approve · revise · restart");
  assert.ok(rule(v2, "7-verification", "mitigate"));
  assert.ok(!gateDef(v2, "7-verification").moves.includes("mitigate"));
  assert.equal(rule(flowOf("v1"), "1-concept", "approve"), undefined, "v1 carries no rules");
});

test("noteRequired is exactly the corrective kinds of each gate", () => {
  assert.deepEqual(noteRequired(v2, "1-concept"), ["revise", "reject"]);
  assert.deepEqual(noteRequired(v2, "5-checkpoint"), ["split+revise"]);
  assert.deepEqual(noteRequired(v2, "6-review"), ["revise", "restart"]);
  assert.deepEqual(noteRequired(v2, "7-verification"), ["reject"]);
  assert.deepEqual(noteRequired(v2, "9-pr"), ["reject"]);
  assert.deepEqual(noteRequired(v2, "gate0"), ["revise", "reject"]);
});

test("targetsOf: earlier active gates only; @build only after the restore point; roadmap only at Concept and Merge; none where there is no reject", () => {
  assert.deepEqual(targetsOf(v2, "1-concept"), ["roadmap"]);
  assert.deepEqual(targetsOf(v2, "3-spec"), ["1-concept", "2-architecture", "2a-experience"]);
  assert.deepEqual(targetsOf(v2, "3-spec", { notApplicable: ["2a-experience"], skipped: ["1-concept", "2-architecture"] }), [], "skipped and not-applicable gates are never offered");
  assert.deepEqual(targetsOf(v2, "7-verification"), ["1-concept", "2-architecture", "2a-experience", "3-spec", "4-plan", "5-checkpoint", "@build", "6-review", "6a-ui-review"]);
  assert.deepEqual(targetsOf(v2, "9-pr").slice(-2), ["8-docs", "roadmap"]);
  assert.ok(!targetsOf(v2, "4-plan").includes("@build"));
  assert.ok(!targetsOf(v2, "4-plan").includes("roadmap"));
  assert.deepEqual(targetsOf(v2, "5-checkpoint"), []);
  assert.deepEqual(targetsOf(v2, "6-review"), []);
  assert.deepEqual(targetsOf(v2, "gate0"), [], "the admission crossing's reject ends the walk; it names no target");
});

test("triage: Concept and Architecture only; Documentation, Work plan and every judged gate after Architecture are refused by name; a flow may forbid it", () => {
  assert.deepEqual(triageProposal(v2), ["1-concept", "2-architecture"]);
  assert.deepEqual(triage(v2, ["2-architecture", "1-concept"]), { ok: true, skip: ["1-concept", "2-architecture"] });
  assert.deepEqual(triage(v2, []), { ok: true, skip: [] });
  for (const k of ["8-docs", "4-plan", "3-spec", "6-review", "7-verification", "2a-experience", "6a-ui-review", "9-pr", "gate0"] as const) {
    const r = triage(v2, ["1-concept", k]);
    assert.equal(r.ok, false, `${k} must not be skippable`);
    assert.match((r as { refusal: string }).refusal, /Concept and Architecture only/);
  }
  const forbid = { ...copy(), noTriageSkip: true };
  assert.deepEqual(triage(forbid, ["1-concept"]), { ok: false, refusal: "this flow forbids triage skipping (no_triage_skip)" });
});

test("cap: default 2, settable 0–3, refused outside", () => {
  assert.deepEqual(cap(v2), { ok: true, cap: 2 });
  for (const n of [0, 1, 2, 3]) assert.deepEqual(cap(v2, n), { ok: true, cap: n });
  for (const n of [-1, 4, 2.5, NaN]) assert.equal(cap(v2, n).ok, false, `${n} must be refused`);
  assert.equal(cap(flowOf("v1"), 2).ok, true, "v1 carries Verification's cap too");
});

test("SC-009: change the DATA and the answers change with no other change (a vocabulary narrowed, a gate removed, a triage flag moved)", () => {
  const narrowed = copy();
  const concept = narrowed.gates.find((g) => g.key === "1-concept")!;
  concept.moves = ["approve", "reject"];
  delete concept.rules!.revise;
  assert.ok(rule(v2, "1-concept", "revise"));
  assert.equal(rule(narrowed, "1-concept", "revise"), undefined);
  assert.deepEqual(noteRequired(narrowed, "1-concept"), ["reject"]);

  const shorter = copy();
  shorter.gates = shorter.gates.filter((g) => g.key !== "4-plan");
  assert.equal(next(v2, NO_PINS, "3-spec"), "4-plan");
  assert.equal(next(shorter, NO_PINS, "3-spec"), "5-checkpoint");

  const moved = copy();
  moved.gates.find((g) => g.key === "1-concept")!.triage = undefined;
  assert.deepEqual(triageProposal(moved), ["2-architecture"]);
});

import { unitRoles, upstreamOf } from "#contracts/flow/engine.ts";

test("unitRoles: an author for every gate whose artifact is its own, a judge where the data names one, and NO author for the judged gates that judge the code", () => {
  assert.deepEqual(unitRoles(v2, "1-concept"), ["author"]);
  assert.deepEqual(unitRoles(v2, "2-architecture"), ["author", "judge"]);
  assert.deepEqual(unitRoles(v2, "2a-experience"), ["author", "judge"]);
  assert.deepEqual(unitRoles(v2, "5-checkpoint"), ["author"], "Implementation builds the code: it is not judged after the restore point");
  assert.deepEqual(unitRoles(v2, "6-review"), ["judge"]);
  assert.deepEqual(unitRoles(v2, "6a-ui-review"), ["check", "judge"]);
  assert.deepEqual(unitRoles(v2, "7-verification"), ["judge"]);
  assert.deepEqual(unitRoles(v2, "8-docs"), ["author"]);
  assert.deepEqual(unitRoles(v2, "9-pr"), ["author"]);
});

test("upstreamOf: the active gates before, and @build (the code) for the gates after the restore point", () => {
  assert.deepEqual(upstreamOf(v2, "1-concept"), []);
  assert.deepEqual(upstreamOf(v2, "3-spec"), ["1-concept", "2-architecture", "2a-experience"]);
  assert.deepEqual(upstreamOf(v2, "3-spec", { notApplicable: ["2a-experience"], skipped: ["1-concept"] }), ["2-architecture"]);
  assert.deepEqual(upstreamOf(v2, "5-checkpoint").includes("@build"), false);
  assert.deepEqual(upstreamOf(v2, "6-review").slice(-2), ["5-checkpoint", "@build"]);
  assert.ok(upstreamOf(v2, "7-verification").includes("@build"));
});
