// r14 T026: the walk's pure reducers — start, the work queue, artifact revisions, approval and the next gate — and the briefs built from them. No store, no clock.
import { test } from "node:test";
import assert from "node:assert/strict";
import { applicability, flowOf } from "#contracts/flow/index.ts";
import type { Applicability } from "#contracts/flow/types.ts";
import type { GateKey } from "#contracts/moves.ts";
import { admissionBrief, gateBrief } from "#durable/walk/brief.ts";
import { approve, artifactRev, pinsOf, queueFor, startState, vectorOf, withRev, type PinnedState } from "#durable/walk/state.ts";

const flow = flowOf("v2");
const pinnedFor = (facts: { paths?: string[]; labels?: string[]; journeys?: string[] }, required: GateKey[] = []): PinnedState => {
  const applicability_: Partial<Record<GateKey, Applicability>> = {};
  for (const g of flow.gates) if (g.appliesWhen) applicability_[g.key] = applicability(g, facts, required);
  return { applicability: applicability_, skipped: {}, required, cap: 2, overrideTriage: false };
};
const UI = pinnedFor({ paths: ["web/a.tsx"] });
const PLAIN = pinnedFor({ paths: ["src/a.ts"] });

test("from an all-applicable pin the walk visits the eleven feature gates in order, round numbering starts at 1, approvals are recorded", () => {
  let w = startState(flow, UI, "1-concept");
  const seen: string[] = [];
  for (;;) {
    seen.push(w.cursor);
    const round = (w.rounds[w.cursor] ?? 0) + 1;
    w = withRev(flow, { ...w, rounds: { ...w.rounds, [w.cursor]: round } }, w.cursor, round, false);
    const adv = approve(flow, w, w.cursor, round, undefined);
    w = adv.w;
    if (adv.next === null) break;
  }
  assert.deepEqual(seen, ["1-concept", "2-architecture", "2a-experience", "3-spec", "4-plan", "5-checkpoint", "6-review", "6a-ui-review", "7-verification", "8-docs", "9-pr"]);
  assert.equal(Object.keys(w.approved).length, 11);
  assert.ok(Object.values(w.rounds).every((r) => r === 1));
});

test("a plain pin skips the two interface gates, and UI review turns on at its slot only when the changed files say so", () => {
  assert.deepEqual(pinsOf(PLAIN).notApplicable, ["2a-experience", "6a-ui-review"]);
  const w0 = startState(flow, PLAIN, "1-concept");
  const to = (w: typeof w0, k: GateKey) => ({ ...w, cursor: k });
  assert.equal(approve(flow, to(w0, "2-architecture"), "2-architecture", 1, undefined).next, "3-spec");
  const off = approve(flow, to(w0, "6-review"), "6-review", 1, { ui_files_changed: false });
  assert.equal(off.next, "7-verification");
  assert.equal(off.became, null);
  const on = approve(flow, to(w0, "6-review"), "6-review", 1, { ui_files_changed: true });
  assert.equal(on.next, "6a-ui-review");
  assert.equal(on.became?.why, "became-applicable");
  assert.deepEqual(pinsOf(on.w.pinned).notApplicable, ["2a-experience"], "UI review is no longer pinned away; Experience design never changes");
});

test("the work queue is the gate's author · check · judge from the data, with a build prelude first when there is one", () => {
  const w = startState(flow, UI, "2-architecture");
  assert.deepEqual(queueFor(flow, w), ["author", "judge"]);
  assert.deepEqual(queueFor(flow, { ...w, cursor: "6a-ui-review", prelude: ["rebuild"] }), ["rebuild", "check", "judge"]);
});

test("artifact revisions are deterministic, change with the label, the upstream vector and the note, and sameContent drops the note", () => {
  const w = startState(flow, UI, "3-spec");
  const a = withRev(flow, w, "3-spec", 1, false);
  assert.equal(a.revs["3-spec"], withRev(flow, w, "3-spec", 1, false).revs["3-spec"]);
  assert.notEqual(a.revs["3-spec"], withRev(flow, w, "3-spec", 2, false).revs["3-spec"]);
  assert.notEqual(a.revs["3-spec"], withRev(flow, { ...w, instruction: { from: "g", note: "x" } }, "3-spec", 1, false).revs["3-spec"]);
  assert.equal(withRev(flow, w, "3-spec", 1, true).revs["3-spec"], withRev(flow, { ...w, instruction: { from: "g", note: "x" } }, "3-spec", 2, true).revs["3-spec"], "same content: identical whatever the round and note");
  assert.notEqual(artifactRev("a", "l", {}, ""), artifactRev("b", "l", {}, ""));
  assert.deepEqual(Object.keys(vectorOf(flow, w, "3-spec")), ["1-concept", "2-architecture", "2a-experience"]);
});

test("no reducer reads a clock or the environment", async () => {
  const { readFileSync } = await import("node:fs");
  for (const f of ["state.ts", "brief.ts"]) {
    const src = readFileSync(new URL(`../../src/walk/${f}`, import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(src, /Date\.now|new Date|performance\.now|process\.env|Math\.random/, f);
  }
});

test("briefs: the admission brief shows what each interface gate would do and why; a first-crossing gate brief has no recross and the right shape", () => {
  const b = admissionBrief(flow, "f", 1, { paths: ["web/a.tsx"] }, { skip: true, reasoning: "tiny" }, undefined) as Record<string, any>;
  assert.equal(b.kind, "admission");
  assert.equal(b.interfaceGates["2a-experience"].applies, true);
  assert.match(b.interfaceGates["2a-experience"].reason.text, /path "web\/a.tsx" matches "web\/\*\*"/);
  assert.deepEqual(b.triage, { proposed: true, reasoning: "tiny" });
  assert.deepEqual(b.fixRounds, { default: 2, min: 0, max: 3 });
  const w = withRev(flow, startState(flow, UI, "3-spec"), "3-spec", 1, false);
  const g = gateBrief(flow, "f", w, "3-spec", 1) as Record<string, any>;
  assert.deepEqual([g.kind, g.gate, g.round, g.instruction, g.recross, g.triage, g.fix], ["gate", "3-spec", 1, null, null, null, null]);
  assert.deepEqual(gateBrief(flow, "f", w, "7-verification", 1) && (gateBrief(flow, "f", w, "7-verification", 1) as Record<string, any>).fix, { cap: 2, used: 0, verdicts: [] });
  assert.equal(JSON.stringify(gateBrief(flow, "f", w, "3-spec", 1)), JSON.stringify(gateBrief(flow, "f", w, "3-spec", 1)), "the same state gives the same bytes");
});
