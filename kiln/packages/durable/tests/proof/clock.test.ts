// r13 T041 — no clock, no time, no absence settles a gate (spec US1 scenarios 3 and 4, FR-011, SC-004). The clock handed to records jumps TEN YEARS forward and TEN YEARS back across restarts, real
// time passes, and a HEADLESS run (no completer ever attached) leaves the gate open: it is still waiting, the store holds NO timer, sleep or deadline on the gate or its decision (I7), nothing
// is auto-approved — and a person's move still commits. The clock is a FACT (it stamps `decidedAt`), never a trigger.
import { test } from "node:test";
import assert from "node:assert/strict";
import { briefRef } from "#durable/canonical.ts";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants } from "./support/oracle.ts";
import { makeStore, runThenKill } from "./support/harness.ts";

const TEN_YEARS_MS = 10 * 365 * 24 * 3600 * 1000;
const GATE = "gate:demo:gate0:1";
const BRIEF = { title: "Roadmap" };
const OPEN = { op: "open", key: "o1", spec: { gateId: GATE, gateKey: "gate0", flow: "v2", brief: BRIEF, openedBy: "factory" } };
const MOVE = { op: "submit", gate: GATE, key: "m1", move: { kind: "approve", decidedBy: "person@example", briefRef: briefRef(BRIEF) } };

test("a clock ten years ahead, then ten years behind, then real time passing: the gate is still waiting, no timer exists, and nothing was settled", async () => {
  const ts = makeStore();
  try {
    await runThenKill(ts, { script: [OPEN] });
    for (const offset of [TEN_YEARS_MS, -TEN_YEARS_MS, 0]) {
      const life = await runThenKill(ts, { clockOffsetMs: offset, script: [{ op: "state", gate: GATE }, { op: "sleep", ms: 700 }] });
      assert.equal((life.results[0] as { state: string }).state, "waiting", `clock offset ${offset}`);
      assert.equal((life.results[life.results.length - 1] as { reports: number }).reports, 0);
      const i = await inspectStore(ts.store, GATE);
      assert.equal(i.gate, "waiting", `clock offset ${offset}`);
      assert.equal(i.decision, "live");
      assert.deepEqual(i.timers, [], "no timer, sleep or deadline on the gate or its decision (I7)");
      assert.deepEqual(checkInvariants(i), []);
      assert.equal(i.records.length, 0, "nothing settled it");
    }
  } finally {
    ts.cleanup();
  }
});

test("HEADLESS: a gate opens, nobody attaches, two seconds of real time pass — it is still waiting and nothing was approved to keep the run going", async () => {
  const ts = makeStore();
  try {
    const run = await runThenKill(ts, { script: [OPEN, { op: "sleep", ms: 2000 }, { op: "state", gate: GATE }] });
    assert.deepEqual(run.results[1], { state: "waiting" });
    const i = await inspectStore(ts.store, GATE);
    assert.equal(i.gate, "waiting");
    assert.equal(i.records.length, 0);
    assert.equal(i.outbox.some((e) => e.type === "move.committed" || e.type === "gate.settled"), false, "no move and no settlement were ever recorded");
    assert.deepEqual(i.timers, []);
  } finally {
    ts.cleanup();
  }
});

test("a person's move still commits after the clock has been anywhere, and the clock only STAMPS it (decidedAt is the injected clock, a fact)", async () => {
  const ts = makeStore();
  try {
    await runThenKill(ts, { script: [OPEN] });
    await runThenKill(ts, { clockOffsetMs: TEN_YEARS_MS, script: [{ op: "sleep", ms: 300 }] });
    const run = await runThenKill(ts, { clockOffsetMs: -TEN_YEARS_MS, script: [MOVE, { op: "sleep", ms: 800 }] });
    const r = run.results[0] as { status: string; record: { decidedAt: number } };
    assert.equal(r.status, "committed");
    const expected = Date.now() - TEN_YEARS_MS;
    assert.ok(Math.abs(r.record.decidedAt - expected) < 60_000, `decidedAt ${r.record.decidedAt} should be about ten years ago (${expected}): it is the injected clock`);
    const i = await inspectStore(ts.store, GATE);
    assert.equal(i.records.length, 1);
    assert.deepEqual(checkInvariants(i), []);
  } finally {
    ts.cleanup();
  }
});
