// r14 T060 (US5): where moves lead — the walk carries out the consequence the flow data gives. Revise, reject (same gate, an earlier gate, the roadmap), restart, split+revise, the admission crossing's outcomes;
// a note on every corrective move that becomes the next step's instruction; every gate after a reject's target RE-CROSSED, its brief saying what changed — and a gate recorded not applicable is never re-crossed.
import { test } from "node:test";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { checkInvariants } from "./../proof/support/oracle.ts";
import { checkWalkInvariants, walkGateIds } from "./../proof/support/walk-oracle.ts";
import { drive, INTERFACE, mkMove, moveHere, openedOrder, PLAIN, rowOf, walkTo, withFactory } from "./support.ts";
import type { Refusal } from "#durable/types.ts";

const brief = (v: { openGate: { brief: unknown } | null }) => v.openGate!.brief as Record<string, any>;

test("revise: a note is required; with one the SAME gate opens a new round and the note is the next step's instruction", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", PLAIN);
  const at = await walkTo(f, "f", "3-spec");
  const bad = await f.gates.submit(at.openGate!.gateId, "x", mkMove(at.openGate!, { kind: "revise" }));
  assert.equal((bad as Refusal).reason, "invalid-move");
  assert.match((bad as Refusal).detail ?? "", /needs a note/);
  const { next } = await moveHere(f, "f", at, { kind: "revise", note: "FR-3 is not testable: give it a number" });
  assert.deepEqual([next.openGate!.gateKey, next.openGate!.round], ["3-spec", 2]);
  assert.deepEqual(brief(next).instruction, { from: "gate:f:3-spec:1", note: "FR-3 is not testable: give it a number" });
  assert.equal(brief(next).recross, null, "a revise re-crosses nothing");
  const units = (await f.tasks.list()).filter((t) => t.kind === "kiln.unit");
  assert.equal(units.length, 5, "concept 1 · architecture 2 · specification 1 · the fresh specification author 1");
}));

test("reject with no target → a FRESH author at the same gate, a new round; nothing is re-crossed and earlier gates are not reopened", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", PLAIN);
  const at = await walkTo(f, "f", "4-plan");
  const { next } = await moveHere(f, "f", at, { kind: "reject", note: "start the plan over" });
  assert.deepEqual([next.openGate!.gateKey, next.openGate!.round], ["4-plan", 2]);
  assert.equal(brief(next).recross, null);
  assert.deepEqual(openedOrder(next).filter((k) => k.startsWith("1-") || k.startsWith("2-") || k.startsWith("3-")), ["1-concept#1", "2-architecture#1", "3-spec#1"]);
}));

test("reject → an earlier gate: that gate opens fresh and EVERY active gate after it is re-crossed, one after another, each brief saying what changed; earlier approvals are kept", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", PLAIN);
  const at = await walkTo(f, "f", "8-docs");
  const { outcome, next } = await moveHere(f, "f", at, { kind: "reject", note: "the spec is wrong about ordering", target: "3-spec" });
  assert.equal(outcome.status, "committed");
  assert.deepEqual([next.openGate!.gateKey, next.openGate!.round], ["3-spec", 2]);
  assert.equal(brief(next).recross.isTarget, true);
  assert.equal(brief(next).recross.target, "3-spec");
  assert.equal(brief(next).instruction.note, "the spec is wrong about ordering");
  const seen: string[] = [];
  let v = next;
  for (let n = 0; n < 12 && v.openGate; n++) {
    const g = v.openGate;
    seen.push(`${g.gateKey}#${g.round}`);
    if (g.gateKey !== "3-spec") {
      const r = brief(v).recross;
      assert.ok(r && r.target === "3-spec" && r.isTarget === false, `${g.gateKey}: a re-crossed gate says it is re-crossed`);
      if (!["8-docs", "9-pr"].includes(g.gateKey)) {
        assert.ok(r.changedSince.some((c: { gate: string }) => c.gate === "3-spec"), `${g.gateKey}: the brief says Specification changed since this gate was approved`);
        assert.equal(r.unchanged, false);
      } else assert.deepEqual(r.changedSince, [], `${g.gateKey} was never approved before (it was rejected, or never reached): there is nothing to compare with`);
    }
    v = (await moveHere(f, "f", v, {}, "ap")).next;
  }
  assert.deepEqual(seen, ["3-spec#2", "4-plan#2", "5-checkpoint#2", "6-review#2", "7-verification#2", "8-docs#2", "9-pr#1"], "Experience design and UI review are not applicable: not re-crossed; Merge had not been reached");
  assert.equal(v.status, "done");
  assert.equal((await rowOf(f))?.status, "terminal");
  const opened = openedOrder(v);
  assert.equal(opened.filter((k) => k === "1-concept#1").length, 1);
  assert.ok(!opened.includes("1-concept#2") && !opened.includes("2-architecture#2"), "gates before the target were not re-crossed");
  assert.ok(v.history.some((h) => h.type === "walk.returned" && (h.data as any).target === "3-spec" && (h.data as any).recross.length === 7));
  assert.deepEqual(checkWalkInvariants(await f.inspect(), { feature: "f", facts: PLAIN.facts }), []);
  for (const g of walkGateIds(await f.inspect(), "f")) assert.deepEqual(checkInvariants(await f.inspect(g)), [], g);
}));

test("a reject at a gate that had approved nothing after it re-crosses with no earlier approval to compare: the brief still names the target and says nothing was approved before", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", PLAIN);
  const at = await walkTo(f, "f", "4-plan");
  const { next } = await moveHere(f, "f", at, { kind: "reject", note: "back to the spec", target: "3-spec" });
  const after = (await moveHere(f, "f", next, {}, "ap")).next;
  assert.deepEqual([after.openGate!.gateKey, after.openGate!.round], ["4-plan", 2]);
  assert.equal(brief(after).recross.target, "3-spec");
  assert.deepEqual(brief(after).recross.changedSince, []);
  assert.equal(brief(after).recross.unchanged, false, "never approved: not 'unchanged'");
}));

test("a re-crossed gate whose upstream is unchanged says plainly that nothing it judges changed (sameContent makes a fresh author yield the same content)", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", { ...PLAIN, script: { sameContent: ["3-spec"] } });
  const at = await walkTo(f, "f", "8-docs");
  const { next } = await moveHere(f, "f", at, { kind: "reject", note: "reconsider", target: "3-spec" });
  const afterTarget = (await moveHere(f, "f", next, {}, "ap")).next;
  assert.equal(afterTarget.openGate!.gateKey, "4-plan");
  assert.deepEqual(brief(afterTarget).recross.changedSince, []);
  assert.equal(brief(afterTarget).recross.unchanged, true, "nothing 4-plan judges changed — and it is still a person's decision, with no lighter confirmation");
}));

test("reject → the roadmap at Concept ends the walk (left the lane); at any other gate the target is refused", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", PLAIN);
  const mid = await walkTo(f, "f", "4-plan");
  const refused = await f.gates.submit(mid.openGate!.gateId, "x", mkMove(mid.openGate!, { kind: "reject", note: "n", target: "roadmap" }));
  assert.equal((refused as Refusal).reason, "invalid-move");
  assert.match((refused as Refusal).detail ?? "", /"roadmap" is not a place this gate can send work/);

  await f.walks.admit("k2", "g", PLAIN);
  const c = await walkTo(f, "g", "1-concept");
  const { outcome, next } = await moveHere(f, "g", c, { kind: "reject", note: "not worth building", target: "roadmap" });
  assert.equal(outcome.status, "committed");
  assert.equal(next.status, "left-lane");
  assert.equal(next.openGate, null);
  assert.ok(next.history.some((h) => h.type === "walk.left-lane" && h.actor === "script:r14"));
  const rows = (await f.tasks.list()).filter((t) => t.kind === "kiln.row");
  assert.deepEqual(rows.map((r) => (r.outcome as any)?.result?.outcome).sort(), [undefined, "left-lane"].sort());
}));

test("Verification's reject with no target → rework on the CURRENT CODE, then Code review (and what follows) is re-crossed; no automatic round after a person's reject", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", { ...PLAIN, verifier: ["fail", "fail", "fail"] });
  const at = await walkTo(f, "f", "7-verification");
  assert.equal(brief(at).fix.cap, 2);
  const { next } = await moveHere(f, "f", at, { kind: "reject", note: "requirement 3 still fails" });
  assert.deepEqual([next.openGate!.gateKey, next.openGate!.round], ["6-review", 2], "the code is judged again first");
  assert.equal(brief(next).recross.target, "@build");
  const units = (await f.tasks.list()).filter((t) => t.kind === "kiln.unit");
  assert.ok(units.length > 0);
  const v2 = (await moveHere(f, "f", next, {}, "ap")).next;
  assert.deepEqual([v2.openGate!.gateKey, v2.openGate!.round], ["7-verification", 2]);
  assert.equal(brief(v2).fix.used >= 0, true);
}));

test("restart at Code review → a REBUILD from the restore point, then Code review again; restart at UI review re-crosses Code review too", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", PLAIN);
  const cr = await walkTo(f, "f", "6-review");
  const { next } = await moveHere(f, "f", cr, { kind: "restart", note: "wrong approach" });
  assert.deepEqual([next.openGate!.gateKey, next.openGate!.round], ["6-review", 2]);
  assert.equal(brief(next).recross.target, "@build");

  await f.walks.admit("k2", "g", INTERFACE);
  const ui = await walkTo(f, "g", "6a-ui-review");
  const r = await moveHere(f, "g", ui, { kind: "restart", note: "the interface approach is wrong" });
  assert.deepEqual([r.next.openGate!.gateKey, r.next.openGate!.round], ["6-review", 2], "rebuilt code goes through Code review before UI review");
  const r2 = await moveHere(f, "g", r.next, {}, "ap");
  assert.deepEqual([r2.next.openGate!.gateKey, r2.next.openGate!.round], ["6a-ui-review", 2]);
}));

test("revise at Code review → the WORKERS on the current code, then a fresh review of the whole diff (same gate, new round, nothing re-crossed)", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", PLAIN);
  const cr = await walkTo(f, "f", "6-review");
  const before = (await f.tasks.list()).filter((t) => t.kind === "kiln.unit").length;
  const { next } = await moveHere(f, "f", cr, { kind: "revise", note: "fix the three findings" });
  assert.deepEqual([next.openGate!.gateKey, next.openGate!.round], ["6-review", 2]);
  assert.equal(brief(next).recross, null);
  assert.equal(brief(next).instruction.note, "fix the three findings");
  const after = (await f.tasks.list()).filter((t) => t.kind === "kiln.unit").length;
  assert.equal(after - before, 2, "a workers unit and a fresh judge unit");
}));

test("split+revise at Implementation → a split is recorded with the remainder as a PROPOSAL; the work plan is revised and re-crossed", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", PLAIN);
  const impl = await walkTo(f, "f", "5-checkpoint");
  const { next } = await moveHere(f, "f", impl, { kind: "split+revise", note: "the export part becomes its own feature" });
  assert.deepEqual([next.openGate!.gateKey, next.openGate!.round], ["4-plan", 2]);
  const split = next.history.find((h) => h.type === "walk.split")!;
  assert.deepEqual([(split.data as any).remainderRef, (split.data as any).remainderDigest], ["move:gate:f:5-checkpoint:1#note", createHash("sha256").update("the export part becomes its own feature").digest("hex")], "the remainder is a reference and a digest, not text");
  assert.ok(!("remainder" in (split.data as object)));
  assert.equal(split.actor, "script:r14");
  assert.ok(!next.history.some((h) => h.type === "walk.admitted" && h.subject !== "f"), "nothing was admitted: only the Roadmap gate admits");
  const noReject = await f.gates.submit((await moveHere(f, "f", next, {}, "a1")).next.openGate!.gateId, "x", mkMove(impl.openGate!, { kind: "reject", note: "n" }));
  assert.equal((noReject as Refusal).status, "refused", "Implementation has no reject");
}));

test("a target that is not applicable is never offered: the refusal lists only the gates this walk actually crossed", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", PLAIN);
  const at = await walkTo(f, "f", "3-spec");
  const r = await f.gates.submit(at.openGate!.gateId, "x", mkMove(at.openGate!, { kind: "reject", note: "n", target: "2a-experience" }));
  assert.equal((r as Refusal).reason, "invalid-move");
  assert.match((r as Refusal).detail ?? "", /allowed: 3-spec, 1-concept, 2-architecture\)/, "Experience design is not applicable here, so it is not a place to go back to");
}));

test("the admission crossing: revise and the row edits ask again with the note; reject ends the walk as not admitted and nothing opens", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", INTERFACE);
  let v = await f.walks.next("f");
  const rev = await moveHere(f, "f", v, { kind: "revise", note: "show me the interface gates first" }, "r1");
  assert.deepEqual([rev.next.openGate!.gateKey, rev.next.openGate!.round], ["gate0", 2]);
  assert.equal(brief(rev.next).instruction, "show me the interface gates first");
  const edit = await moveHere(f, "f", rev.next, { kind: "edit-rows", note: "moved r14 up" }, "r2");
  assert.deepEqual([edit.next.openGate!.gateKey, edit.next.openGate!.round], ["gate0", 3]);
  const rej = await moveHere(f, "f", edit.next, { kind: "reject", note: "not this one" }, "r3");
  assert.equal(rej.next.status, "not-admitted");
  assert.equal(rej.next.openGate, null);
  assert.ok(rej.next.history.some((h) => h.type === "walk.not-admitted" && h.actor === "script:r14"));
  assert.ok(!rej.next.history.some((h) => h.type === "gate.opened" && !h.subject.includes(":gate0:")), "no gate of the feature opened");
  const row = await rowOf(f);
  assert.deepEqual((row?.outcome as any)?.result, { outcome: "not-admitted", approved: [] });
  v = rej.next;
}));

test("a walk with revisions, a reject to an earlier gate and a restart still ends in order: the invariants hold and Merge is last", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", INTERFACE);
  let n = 0;
  const d = await drive(f, "f", (g) => {
    n++;
    if (g.gateKey === "3-spec" && g.round === 1) return { kind: "revise", note: "tighten" };
    if (g.gateKey === "4-plan" && g.round === 1) return { kind: "reject", note: "wrong order", target: "3-spec" };
    if (g.gateKey === "6-review" && g.round === 1) return { kind: "restart", note: "rebuild" };
    return { kind: "approve", ...(g.gateKey === "gate0" ? { admit: {} } : {}) };
  });
  assert.equal(d.last.status, "done");
  assert.equal(d.steps.at(-1)!.gateKey, "9-pr");
  assert.deepEqual(checkWalkInvariants(await f.inspect(), { feature: "f", facts: INTERFACE.facts }), []);
  assert.ok(n > 14);
}));
