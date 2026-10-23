// kiln/tests/live-walk/live-walk.test.ts — T006/T007 (US1, P1), r3 · E2 `F-LIVE-WALK` + `F-SINGLE`.
//
// The LIVE, FULL-RAIL nine-gate walk is the spine ("the kiln fires LIVE", SC-001): its emitted JSONL
// PASSES 001's UNMODIFIED `kiln/validate/log.ts` with a human `decidedBy` per gate; a no-`decidedBy`
// broken variant FAILs it with a NAMED R3 (SC-002→SC-003, P-V). `F-SINGLE` holds over the walk's per-
// step SNAPSHOTS (a foundry throws, SC-003); realized switches == `switchCount(THROWAWAY_UNITS)`
// (SC-004, P-IV); and every line-of-defense role ran on `strongest` via the inherited `bindRole`
// (P-II — a weaker binding is STILL a config error the schedule rejects, live and local alike).

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLiveWalk, assertLiveSingleLane, liveWalkRecordsSelection } from "../../src/live-walk.ts";
import { makeLiveResident } from "../../src/live-resident.ts";
import { bindRole, isLineOfDefense, LINE_OF_DEFENSE, type Role } from "../../src/roles.ts";
import { validateLog } from "../../validate/log.ts";
import { assertSingleLane, type Lane } from "../../src/lane.ts";

const records = (lines: string[]) => lines.map((l) => JSON.parse(l) as Record<string, unknown>);

// T006 · SC-001 (F-LIVE-WALK): the LIVE, full-rail walk PASSES 001's unmodified log.ts.
test("US1 SC-001 (F-LIVE-WALK): the live nine-gate walk PASSES 001's unmodified log.ts (R1–R6)", async () => {
  const walk = await buildLiveWalk({ mode: "live" }); // NC2: live default
  const res = validateLog(records(walk.lines));
  assert.ok(res.valid, `the live walk PASSes log.ts${res.failures.length ? "\n" + res.failures.join("\n") : ""}`);
  assert.ok(walk.lines.length > walk.gates.length, "the walk emits gates + the recorded selection + a tail wait");
 });

// T006 · SC-001 (cont.): the live `gate-completion` carries a genuine human `decidedBy` per gate (R3).
test("US1 SC-001: every human-decided gate's completion resolves on a human decidedBy OR a distinct pre-delegation (never a silent approval)", async () => {
  const walk = await buildLiveWalk({ mode: "live" });
  const completions = records(walk.lines).filter((r) => r.recordType === "gate-completion");
  assert.ok(completions.length >= 2, "the full rail resolves several gates");
  assert.ok(
   completions.every((gc) => (typeof gc["gate-completion"].decidedBy === "string") || (gc["gate-completion"].preDelegation !== undefined)),
   "every gate-completion resolves on a human decidedBy OR a distinct pre-delegation (P-I/P-V)",
  );
 });
// T006 · SC-001 (a reconstructable prefix): a truncated prefix is still a valid log stream.
test("US1 SC-001: a truncated PREFIX of the live walk still reconstructs + PASSes log.ts", async () => {
  const walk = await buildLiveWalk({ mode: "live" });
  const prefix = walk.lines.slice(0, Math.max(2, Math.floor(walk.lines.length / 2)));
  assert.ok(validateLog(records(prefix)).valid, "a prefix of the live stream is gap-free + valid (R2 strictly increasing)");
});

// T006 · SC-002→SC-003 (P-V): the broken no-`decidedBy` variant FAILs log.ts with a NAMED R3.
test("US1 SC-002→SC-003 (P-V): a no-`decidedBy` broken walk FAILs log.ts with a named R3", async () => {
  const broken = await buildLiveWalk({ mode: "live", brokenNoDecider: true });
  assert.ok(broken.broken, "the brokenNoDecider flag marks the live emit as broken");
  const res = validateLog(records(broken.lines));
  assert.ok(!res.valid, "the broken live walk FAILs log.ts");
  assert.match(res.failures.join("\n"), /R3/, "the failure is NAMED R3 (the no-silent-approval hole, P-V)");
});

// T007 · SC-003 (F-SINGLE): every per-step snapshot is a single lane; a forged foundry THROWS.
test("US1 SC-003 (F-SINGLE): a live walk's per-step snapshots are single-lane; a foundry throws", async () => {
  const walk = await buildLiveWalk({ mode: "live" });
  assert.doesNotThrow(() => assertLiveSingleLane(walk), "a live nine-gate walk is never a foundry");
  // A forged two-residents-running-at-once snapshot MUST be detected.
  const forged: Lane[] = [
    { resident: { model: "m", tier: "strongest" }, running: { duId: "A", role: "worker" }, queue: [], switches: 0, wallClock: "00:00", roadmap: [], current: "r3", gate0: { status: "approved" }, gate: null as unknown as null },
    { resident: { model: "m", tier: "strongest" }, running: { duId: "B", role: "worker" }, queue: [], switches: 0, wallClock: "00:00", roadmap: [], current: "r3", gate0: { status: "approved" }, gate: null as unknown as null },
  ];
  assert.throws(() => assertSingleLane(forged), /foundry/, "two running units with no reclaim is a foundry");
});

// T007 · SC-004 (P-IV): realized switches == switchCount — one cost per genuine tier boundary.
// `expectedSwitches` IS `switchCount(THROWAWAY_UNITS)` computed in the builder; the walk SHALL realize it.
test("US1 SC-004 (P-IV): the live walk realizes the affinity tax, live on wallClock", async () => {
  const walk = await buildLiveWalk({ mode: "live" });
  assert.equal(walk.switches, walk.expectedSwitches, "realized switches == the P-IV switchCount counter");
  assert.ok(walk.switches > 0, "a genuine tier change forces at least one swap (P-IV)");
  assert.ok(walk.lines.some((l) => JSON.parse(l).recordType === "cost"), "a cost record brackets each swap");
});

// T007 · SC-004 (cont.): a fresh live resident's LoD roles all bind `strongest` (P-II, unchanged r1).
test("US1 SC-004/SC-003 (P-II): every line-of-defense role in the live walk binds `strongest`", () => {
  const resident = makeLiveResident(); // live head, default tier "strongest"
  for (const role of LINE_OF_DEFENSE as readonly Role[]) {
   assert.equal(bindRole(role, resident.tier()), "strongest", `LoD role ${role} binds strongest (P-II)`);
    assert.ok(isLineOfDefense(role), `${role} is a line-of-defense role`);
     }
   // A WEAKER tier binding a LoD role is STILL a config error the schedule rejects — live and local alike.
  assert.throws(() => bindRole("architecture-critic", "standard"), /strongest/, "a weaker LoD binding is a config error even on a live local model");
});

// T007 · E3/F-NOT-SILENT (SC-006): the live walk RECORdS its resident selection in the log.
test("US1 SC-006 (F-NOT-SILENT): the live walk's resident selection IS recorded (E3)", async () => {
  const walk = await buildLiveWalk({ mode: "live" });
  assert.ok(liveWalkRecordsSelection(walk, "live"), "the --live selection is recorded in the emitted log");
  const stub = await buildLiveWalk({ mode: "stub" });
  assert.ok(liveWalkRecordsSelection(stub, "stub"), "even the --stub fallback is recorded — never silent");
 });
