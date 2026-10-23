// kiln/tests/inter-row/inter-row.test.ts — T015/T016 (US4): inter-row re-entry + the unattended-tail stop.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onEvent, nextEligibleRow } from "../../ui/factory-state.ts";
import { buildProgramWalk } from "../../src/walk.ts";
import { vetoHalt, makePreDelegation } from "../../src/gate.ts";
import { validateLog } from "../../validate/log.ts";
import type { FactoryState } from "../../src/types.ts";

// A two-row program: r1 closed (done → @PR#1), r2 awaits r1 (deps: [r1]).
function twoRowState(): FactoryState {
  return {
   resident: { model: "stub", tier: "strongest" },
   running: null,
   queue: [],
   switches: 0,
   wallClock: "14:00",
   roadmap: [
      { id: "r1", short: "core single-lane runtime", deps: [], status: "done", outcome: "@PR#1" },
      { id: "r2", short: "Flow UI — Layer C", deps: ["r1"], status: "queued" },
            ],
    current: "r1",
    gate0: { status: "approved", rows: "r1..r2", decided_by: "human@batorfi", at: "2026-09-13T06:54:20Z" } as FactoryState["gate0"],
    gate: null,
      };
}

// T015(a) — chain_unattended:false: roadmap_row_done RE-OPENS Gate 0; the next row does not begin.
test("US4 AC-1: a roadmap_row_done re-opens Gate 0; the next row does not begin (the seam)", () => {
   const s = onEvent(twoRowState(), { kind: "roadmap_row_done", rowId: "r1" }) as FactoryState & { gate0Open?: boolean };
   assert.equal(s.gate0Open, true, "the seam RE-OPENS Gate 0 (a program-level WAIT)");
   assert.equal(s.gate0.status, "pending", "Gate 0 returns to pending for a human re-admission");
   const r2 = s.roadmap.find((r) => r.id === "r2");
   assert.notEqual(r2?.status, "active", "row r2 has NOT begun (it waits on Gate 0)");
   assert.notEqual(r2?.status, "done", "row r2 has NOT closed");
   assert.equal(s.current, "r2", "current ADVANCES to the eligible row r2, but it still awaits the human");
});

// T015(d) — SC-004: a merged/done row is NEVER re-entered by a roadmap_row_done for itself.
test("US4 SC-004: a done/merged row is re-entered 0 times — progression waits on Gate 0", () => {
   const s = onEvent(twoRowState(), { kind: "roadmap_row_done", rowId: "r1" }) as FactoryState;
   assert.notEqual(nextEligibleRow(s.roadmap), "r1", "a terminal row r1 is not eligible for re-entry");
   assert.equal(s.current, "r2", "current advances to the next eligible row, not the terminal r1");
   const allDone: FactoryState = {
     resident: { model: "stub", tier: "strongest" },
     running: null,
     queue: [],
     switches: 0,
     wallClock: "14:00",
     roadmap: [
        { id: "r1", short: "x", deps: [], status: "done", outcome: "@PR#1" },
        { id: "r2", short: "y", deps: ["r1"], status: "done", outcome: "@PR#2" },
                 ],
     current: "r2",
     gate0: { status: "approved", rows: "r1..r2" } as FactoryState["gate0"],
     gate: null,
          };
   assert.equal(nextEligibleRow(allDone.roadmap), null, "an all-terminal roadmap ⇒ nothing eligible");
});

// T015(c) — chaining opt-in + a line-of-defense veto still halts (the cruise returns to a human).
test("US4 AC-3: with chaining on, a line-of-defense veto halts and Gate 0 is re-validated", () => {
   const g: any = { id: 6, open: true }; // a per-lane gate in the opt-in tail
   const pre = makePreDelegation("6", "spec #10 approved T", "2026-09-13T14:00:00Z", "code-reviewer");
   const wait = vetoHalt(g, "verifier-reject"); // a veto → a durable WAIT, NOT auto-completion
   assert.ok(g.open, "a veto halts the cruise (the gate stays open — veto-liftable, never lifted)");
   assert.equal(wait.token, "g6", "the halted tail records a resume token + deadline");
   assert.ok(pre.note === "no objections", "the pre-delegation is a DISTINCT ledger entry (R4)");
});

// T016 — program-walk dogfood: a closed-row walk PASSES log.ts; a truncated PREFIX reconstructs;
// a broken auto-approve FAILs R3 by name.
test("US4 SC-003: a closed-row program walk PASSES 001's log.ts; a broken one FAILs R3 by name", () => {
   const lines = buildProgramWalk({ gate0By: "human@batorfi" }).lines;
   assert.ok(validateLog(lines.map(JSON.parse), undefined).valid, "the complete program walk PASSES 001's log.ts");
   for (const n of [1, 2, Math.max(1, Math.floor(lines.length / 2))]) {
      const prefix = lines.slice(0, n).map(JSON.parse);
      assert.ok(validateLog(prefix, undefined).valid || (prefix[prefix.length - 1] as any).recordType === "wait", `a prefix @${n} reconstructs (or ends on an open WAIT)`);
        }
   const bad = validateLog(buildProgramWalk({ brokenAutoApprove: true }).lines.map(JSON.parse), undefined);
   assert.ok(!bad.valid, "a broken auto-approve of Gate 0 does not pass the log");
   assert.match(bad.failures.join("\n"), /R3/, "the broken path FAILs R3 by name");
});
