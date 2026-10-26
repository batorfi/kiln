// r13 T038 — kill the owner at EVERY declared point of a gate's life and judge the wreckage (spec US1, FR-060, SC-001). For each point: arm it in the child owner, drive the open and the move, confirm
// the process died by SIGKILL AT THAT POINT (the kill log), read the store with a fresh reader (oracle I1–I9), restart a clean owner and drive the SAME keys again, read again, and compare:
//   · nothing is ever half-applied (I1–I4), and the restart changes nothing it should not (I5/I6);
//   · a move that was stored is `repeat`, a move that was not is `committed` — the same key is always safe to retry;
//   · exactly one gate.opened, one move.committed, one record in the end.
// A point that never fires fails BY NAME (never vacuous). `recover.start` is a recovery-phase point: the owner is killed once, then restarted with the point armed so it dies during recovery.
import { test } from "node:test";
import assert from "node:assert/strict";
import { briefRef } from "#durable/canonical.ts";
import { KILL_POINTS } from "#durable/hooks.ts";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants, checkStability } from "./support/oracle.ts";
import { assertAllFired } from "./support/guard.ts";
import { makeStore, runOwner, runThenKill } from "./support/harness.ts";

const GATE = "gate:demo:gate0:1";
const BRIEF = { title: "Roadmap" };
const REF = briefRef(BRIEF);
const OPEN = { op: "open", key: "o1", spec: { gateId: GATE, gateKey: "gate0", flow: "v2", brief: BRIEF, openedBy: "factory" } };
const MOVE = { op: "submit", gate: GATE, key: "m1", move: { kind: "approve", decidedBy: "person@example", briefRef: REF } };
const LET_GATE_TASK_RUN = { op: "sleep", ms: 1200 }; // gives the gate task time to wake and settle (so gate.wake / gate.settled can fire)

/** Every declared point the proof drives here. Unit and lane points are proven with their own tasks. */
const POINTS = KILL_POINTS as readonly string[];
const fired: string[] = [];

for (const point of POINTS) {
  test(`killed at ${point}: nothing is half-applied, the restart agrees, and the same keys are safe to retry`, async () => {
    const ts = makeStore();
    try {
      if (point === "recover.start") {
        await runThenKill(ts, { script: [OPEN] }); // a previous life leaves a store behind
        const dying = await runOwner(ts, { script: [], killAt: point, expectDeath: true });
        assert.equal(dying.signal, "SIGKILL", `the owner must die by SIGKILL during recovery; code ${dying.code}\n${dying.stdout()}${dying.stderr()}`);
      } else {
        const dying = await runOwner(ts, { script: [OPEN, MOVE, LET_GATE_TASK_RUN], killAt: point, expectDeath: true, timeoutMs: 40_000 });
        assert.equal(dying.signal, "SIGKILL", `the owner must die by SIGKILL at ${point}; code ${dying.code}\n${dying.stdout()}${dying.stderr()}`);
      }
      assert.deepEqual(ts.killed(), [point], `the kill point ${point} must have FIRED (and only it)`);
      fired.push(point);

      const wreck = await inspectStore(ts.store, GATE);
      assert.deepEqual(checkInvariants(wreck), [], `the wreckage at ${point}: ${JSON.stringify({ gate: wreck.gate, docs: wreck.documents, decision: wreck.decision, gateTask: wreck.gateTask, records: wreck.records.length })}`);

      // 1. a clean restart with NO move: the store must read as it did (I5/I6), and the owner must agree with it; then it is killed so the reading is a crash's
      const quiet = await runThenKill(ts, { script: [OPEN, { op: "state", gate: GATE }, { op: "sleep", ms: 1500 }] });
      const [opened, state] = quiet.results as [{ status: string }, { state: string }];
      assert.ok(["opened", "repeat"].includes(opened.status), `open after ${point}: ${JSON.stringify(opened)}`);
      const wasSettled = wreck.records.length === 1;
      if (wasSettled) assert.equal(state.state, "settled", "the restarted owner reports what the store holds");
      const quietReading = await inspectStore(ts.store, GATE);
      assert.deepEqual(checkInvariants(quietReading), []);
      assert.deepEqual(checkStability(wreck, quietReading), [], `the restart changed what it must not (${point})`);

      // 2. then the SAME move key again: a stored move is a repeat, an unstored one commits — the key is always safe to retry
      const again = await runThenKill(ts, { script: [MOVE, { op: "sleep", ms: 1500 }] });
      const moved = again.results[0] as { status: string };
      assert.equal(moved.status, wasSettled ? "repeat" : "committed", `the same move key after ${point} (the wreck ${wasSettled ? "had" : "had no"} record)`);

      const after = await inspectStore(ts.store, GATE);
      assert.deepEqual(checkInvariants(after), []);
      assert.equal(after.records.length, 1);
      assert.equal(after.records[0].key, "m1");
      assert.equal(after.outbox.filter((e) => e.type === "gate.opened").length, 1, "exactly one gate.opened");
      assert.equal(after.outbox.filter((e) => e.type === "move.committed").length, 1, "exactly one move.committed");
      assert.equal(after.outbox.filter((e) => e.type === "gate.settled").length, 1, "the gate task converged: exactly one gate.settled");
      assert.equal(after.gateTask, "terminal");
      assert.deepEqual(after.timers, []);
    } finally {
      ts.cleanup();
    }
  });
}

test("NEVER VACUOUS: every declared kill point fired — and the run says how many", () => {
  const { exercised, of } = assertAllFired(POINTS, fired);
  console.log(`kill points exercised: ${exercised} of ${of}`);
  assert.equal(exercised, POINTS.length);
});
