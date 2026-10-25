// kiln/tests/twin/twin.test.ts — T012/T013 (US3): the headless twin prints the program + blocks Gate 0.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onEvent, blocksOnGate0 } from "../../ui/factory-state.ts";
import { renderOverlay } from "../../ui/overlay.ts";
import { printHeadless, disabledUi } from "../../ui/twin.ts";
import { gate0AdmitMode } from "../../ui/gate0-face.ts";
import { buildProgramWalk } from "../../src/walk.ts";
import { validateLog } from "../../validate/log.ts";
import type { FactoryState } from "../../src/types.ts";

// A multi-row program with Gate 0 raised headless (the overlay cannot rise without a UI).
function openGate0State(): FactoryState {
   const base: FactoryState = {
     resident: { model: "stub", tier: "strongest" },
     running: null,
     queue: [],
     switches: 0,
     wallClock: "13:20",
     roadmap: [
        { id: "r1", short: "core single-lane runtime", deps: [], status: "done", outcome: "@PR#1" },
        { id: "r2", short: "Flow UI — Layer C", deps: ["r1"], status: "active", gate: 3 },
                  ],
     current: "r2",
     gate0: { status: "approved", rows: "r1..r2", decided_by: "human@batorfi", at: "2026-09-13T06:54:20Z" } as FactoryState["gate0"],
     gate: null,
         };
    // Raise the headless Gate 0 (the overlay cannot rise without a UI): it prints + WAITs.
   return onEvent(base, { kind: "gate0_open" }) as FactoryState;
}

// T012 — F-GATE0-BLOCK: with the overlay ABSENT, the twin prints the roadmap table AND blocks Gate 0.
test("US3 F-GATE0-BLOCK: a disabled overlay prints the program and blocks an open Gate 0", () => {
   const s = openGate0State();
   const twin = disabledUi(s);
   assert.ok(twin.render.includes(renderOverlay(s)), "the headless twin prints the Layer-C roadmap table");
   assert.ok(twin.render.includes("gate0 ·"), "the twin prints the Gate-0 face (the program's gate-0 head)");
   assert.ok(twin.blocks, "a disabled UI blocks an open Gate 0 (F-GATE0-BLOCK)");
   assert.ok(blocksOnGate0(s), "Gate 0 is open after gate0_open");
});

// T012 (cont.) — SC-005: the disabled twin's print EQUALS renderOverlay (one source of truth).
test("US3 SC-005: the headless twin's print EQUALS the disabled render (one source of truth)", () => {
   const s = openGate0State();
   assert.equal(printHeadless(s), disabledUi(s).render, "printHeadless === disabledUi.render");
});

// T012 (cont.) — SC-002→SC-003 NEGATIVE: a broken auto-approve path makes the log FAIL by name.
test("US3 SC-003-negative: a broken auto-approve of a missing Gate 0 FAILs 001's log.ts by name", () => {
   const good = validateLog(buildProgramWalk({ gate0By: "human@batorfi" }).lines.map(JSON.parse), undefined);
   assert.ok(good.valid, "a human-admitted program walk PASSES log.ts");
   const bad = validateLog(buildProgramWalk({ brokenAutoApprove: true }).lines.map(JSON.parse), undefined);
   assert.ok(!bad.valid, "a broken (decider-less) gate-0 does NOT pass the log");
   assert.match(bad.failures.join("\n"), /R3/, "the broken path FAILs with a named R3 reason");
   assert.match(bad.failures.join("\n"), /gate0/i, "the R3 failure names gate0");
});

// T013 — US3 AC-2: a headless Gate 0 records a WAIT, never a gate0:approved.
test("US3 AC-2: a headless Gate 0 records a WAIT and never a 'gate0: approved'", () => {
   const lines = buildProgramWalk({ gate0By: "human@batorfi" }).lines.map(JSON.parse) as Record<string, any>[];
   const waits = lines.filter((r) => r.recordType === "wait" && r.wait?.gate === "gate0");
   assert.equal(waits.length, 1, "exactly one gate-0 WAIT is recorded (recorded, not auto-resolved)");
   for (const w of waits) assert.ok(!("status" in w.wait) || w.wait.status !== "approved", "a gate-0 WAIT never carries status=approved");
   const g0complete = lines.find((r) => r.recordType === "gate-completion" && r["gate-completion"]?.gate === "gate0");
   assert.ok(g0complete, "a recorded gate-0 admission is present");
   assert.ok(String(g0complete["gate-completion"].decidedBy).startsWith("human@"), "the gate-0 admission carries a human decider (never silent)");
});

// T013 (cont.) + F1: a pre-delegated gate-0 is refused (the resolved CRITICAL).
test("US3 F1: a pre-delegated gate-0 is refused — a header only admits a human decider", () => {
   assert.equal(gate0AdmitMode("spec #42 approved T (pre-delegation)"), "refused");
   assert.equal(gate0AdmitMode("human@batorfi"), "human-only");
   assert.equal(gate0AdmitMode(undefined), "refused");
});
