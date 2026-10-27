// r13 T040 — the restart storm (spec US1 scenario 2, FR-040, FR-022, SC-002): the owner is killed and restarted SEVEN times in a row with no move in between — more than the library's own
// crash-loop limit of 5, after which it would park the task it cut off. Nothing is parked, nothing faulted, the gate is still waiting and unparked after EACH restart, and the next valid move
// COMMITS. That last step is what proves the guard is really off (a parked decision never re-registers, so the move would be refused not-ready). Then the same storm on a SETTLED gate: it stays
// settled with the same record (I5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { briefRef } from "#durable/canonical.ts";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants, checkStability } from "./support/oracle.ts";
import { makeStore, runThenKill } from "./support/harness.ts";

export const STORM_KILLS = 7; // > the library's default restartLimit of 5
const GATE = "gate:demo:gate0:1";
const BRIEF = { title: "Roadmap" };
const OPEN = { op: "open", key: "o1", spec: { gateId: GATE, gateKey: "gate0", flow: "v2", brief: BRIEF, openedBy: "factory" } };
const MOVE = { op: "submit", gate: GATE, key: "m1", move: { kind: "approve", decidedBy: "person@example", briefRef: briefRef(BRIEF) } };

test(`${STORM_KILLS} consecutive kills with no move: still waiting, nothing parked or faulted after each, and the next valid move commits`, async () => {
  const ts = makeStore();
  try {
    const first = await runThenKill(ts, { script: [OPEN] });
    assert.equal((first.results[0] as { status: string }).status, "opened");
    const before = await inspectStore(ts.store, GATE);
    assert.equal(before.gate, "waiting");
    let previous = before;
    for (let k = 1; k <= STORM_KILLS; k++) {
      // each life: start, let the decision step re-register, report, die by SIGKILL
      const life = await runThenKill(ts, { script: [{ op: "state", gate: GATE }, { op: "sleep", ms: 200 }] });
      const [state, reports] = [life.results[0] as { state: string }, life.results[life.results.length - 1] as { reports: number }];
      assert.equal(state.state, "waiting", `life ${k}`);
      assert.equal(reports.reports, 0, `life ${k}: the library reported a task parked or faulted`);
      const reading = await inspectStore(ts.store, GATE);
      assert.deepEqual(checkInvariants(reading, { blocked: reports.reports > 0 }), [], `after kill ${k}`);
      assert.deepEqual(checkStability(previous, reading), [], `after kill ${k}`);
      assert.equal(reading.decision, "live", `after kill ${k}: the decision is still live`);
      previous = reading;
    }
    // the decisive step: the move commits after more kills than the library's crash-loop limit
    const last = await runThenKill(ts, { script: [MOVE, { op: "sleep", ms: 1200 }] });
    assert.equal((last.results[0] as { status: string }).status, "committed", `after ${STORM_KILLS} kills the next valid move must commit: ${JSON.stringify(last.results)}`);
    const settled = await inspectStore(ts.store, GATE);
    assert.equal(settled.records.length, 1);
    assert.deepEqual(checkInvariants(settled), []);
  } finally {
    ts.cleanup();
  }
});

test(`${STORM_KILLS} consecutive kills on a SETTLED gate: it stays settled with the very same record (I5)`, async () => {
  const ts = makeStore();
  try {
    await runThenKill(ts, { script: [OPEN, MOVE, { op: "sleep", ms: 1500 }] });
    const settled = await inspectStore(ts.store, GATE);
    assert.equal(settled.gate, "settled");
    assert.equal(settled.gateTask, "terminal");
    let previous = settled;
    for (let k = 1; k <= STORM_KILLS; k++) {
      const life = await runThenKill(ts, { script: [{ op: "state", gate: GATE }, { op: "sleep", ms: 150 }] });
      assert.equal((life.results[0] as { state: string }).state, "settled", `life ${k}`);
      assert.equal((life.results[life.results.length - 1] as { reports: number }).reports, 0);
      const reading = await inspectStore(ts.store, GATE);
      assert.deepEqual(checkInvariants(reading), []);
      assert.deepEqual(checkStability(previous, reading), [], `after kill ${k}`);
      previous = reading;
    }
    assert.deepEqual(previous.records[0], settled.records[0], "the record is exactly as it was");
    assert.equal(previous.outbox.length, settled.outbox.length, "a restart appends no event: nothing happened");
  } finally {
    ts.cleanup();
  }
});
