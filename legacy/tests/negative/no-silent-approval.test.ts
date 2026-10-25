// kiln/tests/negative/no-silent-approval.test.ts — T009 (US1)
// R3/R4 (no silent approval): a gate-completion decision needs a human decidedBy
// OR a DISTINCT pre-delegation record. A WAIT is the only unresolved-gate shape.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDecisions } from "../../validate/log.ts";
import { moveAllowed } from "../../contracts/move-vocabulary.ts";

function gc(seq: number, move: string, decidedBy?: string, preDelegation?: any): Record<string, unknown> {
  return {
    recordType: "gate-completion",
    ts: "2026-09-12T00:00:00Z",
    seq,
    "gate-completion": { gate: 1, move, cost: { switches: 0, wallClock: "00:14" }, ...(decidedBy ? { decidedBy } : {}), ...(preDelegation ? { preDelegation } : {}) },
   };
}

test("R3 an approve with NO decider and NO pre-delegation is a silent approval (FAIL)", () => {
  const recs = [gc(1, "approve")];
  const f = checkDecisions(recs, (g, m) => moveAllowed(g as any, m));
  assert.ok(f.length > 0, "a silent approve must be flagged");
  assert.ok(f.join("\n").includes("no-silent-approval"), "the failure must name the no-silent-approval rule");
});
test("R3 an approve WITH a keyboard human decidedBy passes (the safe path)", () => {
  const recs = [gc(1, "approve", "human@token")];
  assert.equal(checkDecisions(recs, (g, m) => moveAllowed(g as any, m)).length, 0);
});
test("R4 a DISTINCT pre-delegation record authorizes an auto-approve (not a silent approval)", () => {
  const distinct = { recordType: "pre-delegation", ts: "2026-09-12T00:00:00Z", seq: 0, preDelegation: { of: "1", by: "spec #42 approved T", at: "2026-09-12T00:00:00Z", note: "no objections" } };
  const recs = [gc(1, "approve"), distinct];
  assert.equal(checkDecisions(recs as any, (g, m) => moveAllowed(g as any, m)).length, 0, "a distinct pre-delegation record should authorize the auto-approve");
});
test("R4 a distinct pre-delegation record is a SEPARATE ledger entry from the decision (R4)", () => {
  // The two-record shape proves the auto-approve is distinguishable from a human decision.
  const distinct = { recordType: "pre-delegation", ts: "2026-09-12T00:00:01Z", seq: 0, preDelegation: { of: "1", by: "spec #7 approved T", at: "2026-09-12T00:00:01Z", note: "no objections" } };
  const decision = gc(1, "approve");
  const recs = [decision, distinct];
  assert.equal(recs.filter((r) => r.recordType === "pre-delegation").length, 1, "pre-delegation is distinct");
  assert.equal(recs.filter((r) => r.recordType === "gate-completion").length, 1, "the decision itself is a separate record");
});
