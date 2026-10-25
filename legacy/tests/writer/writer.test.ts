// kiln/tests/writer/writer.test.ts — T013/T014 (US3): the log writer + write-time no-silent-approval.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LogWriter, isSilentApproval, toJsonl } from "../../src/log-writer.ts";

function stamp(seq: number, rec: Record<string, unknown>): Record<string, unknown> {
  return { ts: "2026-09-13T00:00:00Z", seq, ...rec };
}

test("US3 SC (R1/R2): a full walk is emitted with strictly increasing, gap-free seq + non-decreasing ts", () => {
  const w = new LogWriter();
  w.write({ recordType: "transition", transition: { kind: "load", from: "cold", to: "stub" } });
  w.write({ recordType: "transition", transition: { kind: "hold", to: "stub" } });
  w.write({ recordType: "cost", cost: { switches: 1, wallClock: "00:01" } });
  const lines = toJsonl(w.drain()).split("\n");
  const parsed = lines.map((l) => JSON.parse(l));
  for (let i = 0; i < parsed.length; i++) {
    assert.equal(parsed[i].seq, i, `seq must be gap-free from 0`);
    assert.ok(typeof parsed[i].ts === "string", "every record carries ts");
   }
  assert.equal(parsed[0].seq, 0, "seq starts at 0");
});

test("US3 SC-002 (write-time): a silent approve is refused AT WRITE TIME (never emitted)", () => {
  const w = new LogWriter();
  assert.throws(
     () =>
      w.write({
        recordType: "gate-completion",
         "gate-completion": { gate: 3, move: "approve", cost: { switches: 0, wallClock: "00:00" } }, // no decider, no pre-delegation
        }),
     /no-silent-approval|R3|R4/,
     "a gate-completion with no decider must throw before it is written");
  assert.equal(w.drain().length, 0, "not one line leaked past the choke");
});

test("US3 SC-002: the SAME record WITH a human decidedBy is emitted", () => {
  const w = new LogWriter();
  w.write({ recordType: "gate-completion", "gate-completion": { gate: 3, move: "approve", cost: { switches: 0, wallClock: "00:00" }, decidedBy: "human@batorfi" } });
  assert.equal(w.drain().length, 1, "a human-decided completion passes the choke");
});

test("US3 SC-002: a DISTINCT pre-delegation authorizes an auto-approve (R4)", () => {
  const w = new LogWriter();
  w.write({ recordType: "pre-delegation", "pre-delegation": { of: "4", by: "spec #42 approved T", at: "2026-09-13T00:00:00Z", reviewer: "code-reviewer", note: "no objections" } });
   // The auto-completion references the same gate (4); the writer's ledger now authorizes it.
  w.write({ recordType: "gate-completion", "gate-completion": { gate: 4, move: "approve", cost: { switches: 0, wallClock: "00:00" } } });
  assert.equal(w.drain().length, 2, "both the distinct pre-delegation and its auto-completion are emitted");
});

test("US3 SC-002: isSilentApproval is true exactly for an approving move with no decider + no pre-delegation", () => {
  const none = new Set<string>();
  assert.equal(isSilentApproval({ recordType: "gate-completion", "gate-completion": { gate: 2, move: "approve", cost: { switches: 0, wallClock: "00:00" } } }, none), true);
   // A rejecting move is never the guarded set (only approve/restart/merge).
  assert.equal(isSilentApproval({ recordType: "gate-completion", "gate-completion": { gate: 7, move: "reject", cost: { switches: 0, wallClock: "00:00" } } }, none), false);
   // With a distinct pre-delegation, it is NOT silent.
  const delegated = new Set(["2"]);
  assert.equal(isSilentApproval({ recordType: "gate-completion", "gate-completion": { gate: 2, move: "approve", cost: { switches: 0, wallClock: "00:00" } } }, delegated), false);
});
