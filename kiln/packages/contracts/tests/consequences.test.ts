// r14 T058 (US5): where a move leads, as an executable table. The rows of `docs/concepts/the-flow.md` §7 are READ AS TEXT, and each row is checked against `consequence()` on the flow data — so the engine and
// the document cannot drift apart. Every (gate, kind) pair the data offers returns a consequence; a pair it does not offer throws by name; "re-crossed" lists only gates that are actually crossed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { active, consequence, flowOf, NO_PINS, gateDef } from "#contracts/flow/index.ts";
import type { GateKey } from "#contracts/moves.ts";

const v2 = flowOf("v2");
const PLAIN = { notApplicable: ["2a-experience", "6a-ui-review"] as GateKey[], skipped: [] as GateKey[] };

test("§7 of the-flow.md has exactly the rows this test knows (a new row must be taught to the engine and to this test)", () => {
  const text = readFileSync(new URL("../../../../docs/concepts/the-flow.md", import.meta.url), "utf8");
  const section = text.slice(text.indexOf("## 7. Where the moves lead"), text.indexOf("**Re-crossing.**"));
  const rows = section.split("\n").filter((l) => /^\| \*\*/.test(l)).map((l) => l.split("|")[1].trim());
  assert.deepEqual(rows, [
    "**approve**", "**revise** (note)", "**reject** (note)", "**revise** (Code review)", "**reject to an earlier gate** (any time)", "**restart** (Code review)", "**split+revise** (Implementation)", "**automatic fix round** (Verification)",
  ]);
});

test("approve → the next gate; nothing is redone", () => {
  assert.deepEqual(consequence(v2, "3-spec", "approve", undefined), { goto: "next", work: "none", recross: [], leaves: false, records: null });
});

test("revise (note) → the same gate, a new round, the same author's conversation; revise at Code review and UI review → the WORKERS on the current code", () => {
  assert.deepEqual(consequence(v2, "3-spec", "revise", undefined), { goto: "3-spec", work: "author", recross: [], leaves: false, records: null });
  assert.deepEqual(consequence(v2, "6-review", "revise", undefined), { goto: "6-review", work: "workers", recross: [], leaves: false, records: null });
  assert.deepEqual(consequence(v2, "6a-ui-review", "revise", undefined), { goto: "6a-ui-review", work: "workers", recross: [], leaves: false, records: null });
});

test("reject (note), no target → a FRESH author at the same gate; nothing is re-crossed", () => {
  for (const g of ["1-concept", "2-architecture", "3-spec", "4-plan", "8-docs", "9-pr"] as GateKey[]) {
    assert.deepEqual(consequence(v2, g, "reject", undefined), { goto: g, work: "author", recross: [], leaves: false, records: null }, g);
    assert.deepEqual(consequence(v2, g, "reject", g), { goto: g, work: "author", recross: [], leaves: false, records: null }, `${g} naming itself`);
  }
});

test("reject to an earlier gate → that gate, and EVERY active gate from it to the end is re-crossed", () => {
  const c = consequence(v2, "4-plan", "reject", "3-spec");
  assert.equal(c.goto, "3-spec");
  assert.deepEqual(c.recross, ["3-spec", "4-plan", "5-checkpoint", "6-review", "6a-ui-review", "7-verification", "8-docs", "9-pr"]);
  assert.equal(c.records, "returned");
  // a gate recorded not applicable has nothing to cross: it is not in the list
  assert.deepEqual(consequence(v2, "4-plan", "reject", "3-spec", PLAIN).recross, ["3-spec", "4-plan", "5-checkpoint", "6-review", "7-verification", "8-docs", "9-pr"]);
  assert.deepEqual(consequence(v2, "9-pr", "reject", "1-concept").recross, active(v2, NO_PINS));
});

test("reject → the roadmap (Concept and Merge) leaves the lane", () => {
  for (const g of ["1-concept", "9-pr"] as GateKey[]) assert.deepEqual(consequence(v2, g, "reject", "roadmap"), { goto: "roadmap", work: "none", recross: [], leaves: true, records: "left-lane" });
});

test("Verification's reject with no target → rework on the CURRENT CODE, then the gates after the build are re-crossed; naming Specification re-crosses from there", () => {
  const c = consequence(v2, "7-verification", "reject", undefined);
  assert.equal(c.goto, "@build");
  assert.equal(c.work, "workers");
  assert.deepEqual(c.recross, ["6-review", "6a-ui-review", "7-verification", "8-docs", "9-pr"]);
  assert.deepEqual(consequence(v2, "7-verification", "reject", undefined, PLAIN).recross, ["6-review", "7-verification", "8-docs", "9-pr"]);
  const spec = consequence(v2, "7-verification", "reject", "3-spec");
  assert.equal(spec.goto, "3-spec");
  assert.equal(spec.work, "author");
  assert.equal(spec.recross[0], "3-spec");
});

test("restart (Code review, UI review) → REBUILD from the restore point, then re-cross from the code; a restart at UI review re-crosses Code review too", () => {
  for (const g of ["6-review", "6a-ui-review"] as GateKey[]) {
    const c = consequence(v2, g, "restart", undefined);
    assert.equal(c.goto, "@build", g);
    assert.equal(c.work, "rebuild", g);
    assert.equal(c.recross[0], "6-review", `${g}: Code review sees the rebuilt code first`);
    assert.equal(c.records, "returned");
  }
});

test("split+revise (Implementation) → the work plan is revised and re-crossed with everything after it; the remainder is a PROPOSAL (recorded as a split)", () => {
  const c = consequence(v2, "5-checkpoint", "split+revise", undefined);
  assert.equal(c.goto, "4-plan");
  assert.deepEqual(c.recross.slice(0, 3), ["4-plan", "5-checkpoint", "6-review"]);
  assert.equal(c.records, "split");
  assert.equal(c.leaves, false);
});

test("the admission crossing: revise and the row edits ask again; a reject admits nothing and the walk ends", () => {
  assert.equal(consequence(v2, "gate0", "revise", undefined).goto, "gate0");
  for (const k of ["edit-rows", "add-row", "drop-row"] as const) assert.equal(consequence(v2, "gate0", k, undefined).goto, "gate0");
  assert.deepEqual(consequence(v2, "gate0", "reject", undefined), { goto: "not-admitted", work: "none", recross: [], leaves: true, records: "not-admitted" });
});

test("every (gate, kind) the data offers has a consequence; a pair it does not offer throws by name", () => {
  for (const g of v2.gates) for (const k of g.moves) assert.ok(consequence(v2, g.key, k, undefined), `${g.key}/${k}`);
  assert.throws(() => consequence(v2, "5-checkpoint", "reject", undefined), /offers no "reject" at 5-checkpoint/);
  assert.throws(() => consequence(v2, "6-review", "reject", undefined), /offers no "reject" at 6-review/);
  assert.throws(() => consequence(v2, "3-spec", "restart", undefined), /offers no "restart"/);
  void gateDef;
});

test("a consequence is data-driven: remove the restore point and a restart has nothing to rebuild (the flow would have been refused by the check first)", () => {
  const d = JSON.parse(JSON.stringify(v2));
  delete d.gates.find((g: { key: string }) => g.key === "5-checkpoint").restorePoint;
  assert.deepEqual(consequence(d, "6-review", "restart", undefined).recross, [], "no restore point → no gates 'after the build'");
});
