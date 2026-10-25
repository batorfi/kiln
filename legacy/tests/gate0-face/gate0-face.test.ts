// kiln/tests/gate0-face/gate0-face.test.ts — T008/T009 (US2): the Gate-0 face (SC-002/SC-003, F1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderGate0Face, recordGate0Decision, gate0AdmitMode, gate0RejectsPerGateMove } from "../../ui/gate0-face.ts";
import { moveVocabulary, moveAllowed } from "../../contracts/move-vocabulary.ts";
import { validateLog } from "../../validate/log.ts";
import type { RoadmapHead, FactoryRecord } from "../../src/types.ts";

function head(): RoadmapHead {
  return {
     deliverable: "kiln-v1",
     owner: "human@batorfi",
     updated: "2026-09-13T06:54:20Z",
     rows: [
       { id: "r1", short: "core single-lane runtime", deps: [], status: "done", outcome: "@PR#1" },
       { id: "r2", short: "Flow UI — Layer C (roadmap overlay)", deps: ["r1"], status: "queued" },
            ],
     ordering: ["r1", "r2"],
     chain_unattended: false,
      gate0: { status: "pending", rows: "r1..r2" },
      trace: "P-VI (Gate 0 human-only), P-V/P-VII (recorded)",
        };
}

const GATE0_VOCAB = moveVocabulary("gate0") as string[];
const stamp = (obj: Record<string, unknown>): Record<string, unknown> => ({ ts: "2026-09-13T01:00:00Z", seq: 0, ...obj });

// T008 — SC-002 / G1: the face shows ONLY the roadmap-level move set (never a per-gate 1–9 set).
test("US2 SC-002/G1: the Gate-0 face shows only moveVocabulary('gate0'); a per-gate move is rejected here", () => {
   const out = renderGate0Face(head());
   for (const m of GATE0_VOCAB) assert.match(out, new RegExp(`\\b${m}\\b`), `${m} is shown on a distinct Gate-0 face`);
   assert.match(out, /Layer C/i, "the face is the distinct Layer-C face (not Layer B's chrome, NC2)");
   assert.ok(!moveAllowed("gate0", "split+revise"), "'split+revise' is not a Gate-0 move (gate0 ≠ gate)");
   assert.ok(gate0RejectsPerGateMove("split+revise"), "a per-gate move is rejected at Gate 0");
   assert.ok(!moveAllowed(5, "edit-rows"), "a Gate-0 edit-move is not a per-gate move — disjoint both ways (SC-002)");
   assert.equal(GATE0_VOCAB.length, 6, "gate0 = [approve, revise, reject, edit-rows, add-row, drop-row]");
});

// T008 — US2 AC-4: an illegal move at Gate 0 is refused and the face stays open (G3).
test("US2 G3: an illegal move at Gate 0 is rejected (the program stays open)", () => {
  assert.throws(() => recordGate0Decision(head(), { move: "not-a-move", decidedBy: "human@batorfi" }), /illegal Gate-0 move|not in moveVocabulary/i);
});

// T009 — SC-003: a human Gate-0 decision records ADDITIVELY and PASSES 001's log.ts (no new record type).
test("US2 SC-003: a human gate-0 admission PASSES 001's log.ts (additive, no new recordType — NC3/D3)", () => {
   const rec = recordGate0Decision(head(), { move: "approve", decidedBy: "human@batorfi" } as { move: string; decidedBy: string });
   const gc = rec["gate-completion"];
   assert.equal(rec.recordType, "gate-completion", "the decision is a gate-completion (no new recordType — NC3/D3)");
   assert.equal(gc.gate, "gate0", "it lands at gate:'gate0'");
   assert.equal(gc.decidedBy, "human@batorfi", "it carries the human decider");
      // Replay a minimal valid stream (the human admission + the re-entered gate-0 WAIT) through 001's validator.
   const records: Record<string, unknown>[] = [
      stamp({ recordType: "gate-completion", "gate-completion": gc }),
      { recordType: "wait", ts: "2026-09-13T01:00:00Z", seq: 1, wait: { gate: "gate0", token: "g0", deadline: "2026-09-13T02:00:00Z" } },
      ];
   const res = validateLog(records, undefined);
   assert.ok(res.valid, `a human gate-0 admission PASSES 001's unmodified log.ts${res.failures.length ? " — " + res.failures.join(" | ") : ""}`);
});

// T009 (cont.) + F1 — SC-003 NEGATIVE + human-only: a gate-0 WITHOUT a human decider FAILs log.ts R3 by
// name, and a pre-delegation does NOT admit Gate 0 (the resolved CRITICAL, P-VI).
test("US2 F1/SC-003-negative: a decider-less gate-0 FAILs log.ts R3; a pre-delegation is refused (P-VI)", () => {
    // The broken vector: a gate-0 completion that would auto-approve with no decider → R3 named.
   const broken: Record<string, unknown>[] = [
      stamp({ recordType: "gate-completion", "gate-completion": { gate: "gate0", move: "approve", cost: { switches: 0, wallClock: "00:00" } } }),
     ];
   const res = validateLog(broken, undefined);
   assert.ok(!res.valid, "a decider-less gate-0 admission does NOT pass the log");
   assert.match(res.failures.join("\n"), /R3/, "001's log.ts names the R3 no-silent-approval violation");
   assert.match(res.failures.join("\n"), /gate0/i, "the R3 failure names gate0");
     // F1 (the CRITICAL): the PRODUCER refuses a pre-delegation / non-human decider at Gate 0.
   assert.throws(() => recordGate0Decision(head(), { move: "approve", decidedBy: "" }), /human decider|F1|P-VI/i);
   assert.throws(() => recordGate0Decision(head(), { move: "approve", decidedBy: "spec #42 approved T (pre-delegation)" }), /human decider|F1|P-VI/i);
   assert.equal(gate0AdmitMode("human@batorfi"), "human-only");
   assert.equal(gate0AdmitMode("spec #42 approved T (pre-delegation)"), "refused", "a pre-delegation is refused at Gate 0");
   assert.equal(gate0AdmitMode(undefined), "refused");
    // The record type is additive: a human admission is still one of 001's record types.
   const type: FactoryRecord["recordType"] = "gate-completion";
   assert.equal(type, "gate-completion");
});
