// T009 — the oracle (invariants I1–I7, data-model §2) judges a REOPENED store from facts alone. Each violation is reported by its number,
// and clean states report nothing. These cases use synthetic inspections: the oracle is pure, so it is tested without any store or library.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkInvariants, checkStability, type Inspection } from "../src/invariants.ts";
import type { MoveRecord } from "../src/port.ts";

const rec = (key = "k1", kind: "approve" | "revise" | "reject" = "approve"): MoveRecord => ({ gateId: "g", key, move: { kind, decidedBy: "human@spike", briefRef: "brief:1" }, seq: 1 });
const base: Inspection = { gate: "waiting", records: [], decisionTask: "live", decisionOutcomeMatches: true, timers: [], blocked: false };
const waiting = (over: Partial<Inspection> = {}): Inspection => ({ ...base, ...over });
const settled = (over: Partial<Inspection> = {}): Inspection => ({ ...base, gate: "settled", records: [rec()], decisionTask: "terminal", ...over });

test("O1 a clean waiting gate and a clean settled gate report no violation", () => {
  assert.deepEqual(checkInvariants(waiting()), []);
  assert.deepEqual(checkInvariants(waiting({ decisionTask: "absent" })), []);
  assert.deepEqual(checkInvariants(settled()), []);
});

test("O2 I1 — a waiting gate that has a move record is reported", () => {
  assert.ok(checkInvariants(waiting({ records: [rec()] })).includes("I1"));
});

test("O3 I2 — a settled gate must have exactly one record AND a terminal decision whose outcome matches the move", () => {
  assert.ok(checkInvariants(settled({ records: [] })).includes("I2"), "settled without a record");
  assert.ok(checkInvariants(settled({ decisionTask: "live" })).includes("I2"), "settled but the decision task is not terminal");
  assert.ok(checkInvariants(settled({ decisionOutcomeMatches: false })).includes("I2"), "settled but the decision's outcome is not the recorded move");
});

test("O4 I3 — the half-applied move: a record without a completed decision, or a completed decision without a record", () => {
  assert.ok(checkInvariants(waiting({ records: [rec()], decisionTask: "live" })).includes("I3"), "move recorded, decision never completed");
  assert.ok(checkInvariants(waiting({ records: [], decisionTask: "terminal" })).includes("I3"), "decision completed, no move recorded");
  assert.ok(checkInvariants(settled({ records: [] })).includes("I3"), "gate settled without a record");
});

test("O5 I4 — more than one record for a gate is reported, whatever else holds", () => {
  assert.ok(checkInvariants(settled({ records: [rec("k1"), rec("k2")] })).includes("I4"));
  assert.ok(checkInvariants(waiting({ records: [rec("k1"), rec("k2")] })).includes("I4"));
});

test("O6 I6 — a blocked (parked) gate is not waiting any more, and is reported", () => {
  assert.ok(checkInvariants(waiting({ blocked: true })).includes("I6"));
  assert.ok(checkInvariants(settled({ blocked: true })).includes("I6") === false, "a settled gate is not required to be unblocked: I6 is about WAITING gates");
});

test("O7 I7 — any timer, sleep or deadline on the gate or decision task is reported", () => {
  assert.ok(checkInvariants(waiting({ timers: ["sleepUntil 99999999999999"] })).includes("I7"));
  assert.ok(checkInvariants(settled({ timers: ["x"] })).includes("I7"));
});

test("O8 every invariant I1…I4, I6, I7 is reachable by at least one case (the oracle can fail on each)", () => {
  const seen = new Set<string>([
    ...checkInvariants(waiting({ records: [rec()] })),
    ...checkInvariants(settled({ decisionTask: "live" })),
    ...checkInvariants(waiting({ records: [], decisionTask: "terminal" })),
    ...checkInvariants(settled({ records: [rec("a"), rec("b")] })),
    ...checkInvariants(waiting({ blocked: true })),
    ...checkInvariants(waiting({ timers: ["t"] })),
  ]);
  for (const n of ["I1", "I2", "I3", "I4", "I6", "I7"]) assert.ok(seen.has(n), `${n} is never reported`);
});

test("O9 I5 / I6 across restarts — a settled gate stays settled with the same record; a waiting gate stays waiting", () => {
  assert.deepEqual(checkStability(settled(), settled()), []);
  assert.deepEqual(checkStability(waiting(), waiting()), []);
  assert.ok(checkStability(settled(), waiting()).includes("I5"), "settled gate reopened");
  assert.ok(checkStability(settled({ records: [rec("k1")] }), settled({ records: [rec("k2")] })).includes("I5"), "a different record after restart");
  assert.ok(checkStability(waiting(), settled()).includes("I6"), "a waiting gate settled by a restart or a clock");
  assert.ok(checkStability(waiting(), waiting({ blocked: true })).includes("I6"), "a waiting gate parked by a restart");
});
