// r13 T036 — exactly once, first move wins, every refusal harmless (spec US2, FR-013 … FR-016, SC-003), at the counts the contract names: 100 identical moves, 100 competing moves, 100 more after
// a restart. The completer runs INSIDE the child owner (a script); the owner is then SIGKILLed and every count is read by a fresh reader — the store's, never the owner's memory.
// (The same cases from a SEPARATE-PROCESS completer are T059.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { briefRef } from "#durable/canonical.ts";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants } from "./support/oracle.ts";
import { makeStore, runThenKill, type TestStore } from "./support/harness.ts";

export const REPEATS = 100;
export const RACERS = 100;
const GATE = "gate:demo:gate0:1";
const BRIEF = { title: "Roadmap" };
const REF = briefRef(BRIEF);
const OPEN = { op: "open", key: "o1", spec: { gateId: GATE, gateKey: "gate0", flow: "v2", brief: BRIEF, openedBy: "factory" } };
const mv = (over: Record<string, unknown> = {}) => ({ kind: "approve", decidedBy: "person@example", briefRef: REF, ...over });
const tally = (rs: any[]) => ({ committed: rs.filter((r) => r.status === "committed"), repeat: rs.filter((r) => r.status === "repeat"), refused: rs.filter((r) => r.status === "refused") });

async function withStore(run: (ts: TestStore) => Promise<void>): Promise<void> {
  const ts = makeStore();
  try {
    await run(ts);
  } finally {
    ts.cleanup();
  }
}

test(`${REPEATS} concurrent identical moves → exactly 1 committed, ${REPEATS - 1} repeat naming the same record, 1 record; and ${REPEATS} more after a SIGKILL and a restart → 0 committed, ${REPEATS} repeat`, () => withStore(async (ts) => {
  const moves = Array.from({ length: REPEATS }, () => ({ key: "k1", move: mv() }));
  const first = await runThenKill(ts, { script: [OPEN, { op: "submitMany", gate: GATE, moves, concurrency: REPEATS }] });
  const t = tally(first.results[1] as any[]);
  assert.equal(t.committed.length, 1, JSON.stringify(t.refused[0]));
  assert.equal(t.repeat.length, REPEATS - 1);
  assert.equal(t.refused.length, 0);
  const record = t.committed[0].record;
  assert.ok(t.repeat.every((r: any) => r.record.key === "k1" && JSON.stringify(r.record) === JSON.stringify(record)), "every repeat names the committed record");
  const i1 = await inspectStore(ts.store, GATE);
  assert.equal(i1.records.length, 1);
  assert.deepEqual(checkInvariants(i1), []);

  const second = await runThenKill(ts, { script: [{ op: "submitMany", gate: GATE, moves, concurrency: REPEATS }] });
  const t2 = tally(second.results[0] as any[]);
  assert.deepEqual([t2.committed.length, t2.repeat.length, t2.refused.length], [0, REPEATS, 0]);
  const i2 = await inspectStore(ts.store, GATE);
  assert.equal(i2.records.length, 1);
  assert.deepEqual(i2.records[0], i1.records[0], "the record is exactly as it was");
  assert.deepEqual(checkInvariants(i2), []);
}));

test(`${RACERS} different keys at once → exactly 1 committed, ${RACERS - 1} refused (lost-race | stale) each naming the winner, 1 record`, () => withStore(async (ts) => {
  const kinds = ["approve", "revise", "reject"];
  const moves = Array.from({ length: RACERS }, (_, n) => ({ key: `race-${n}`, move: mv({ kind: kinds[n % 3], decidedBy: `person-${n}` }) }));
  const run = await runThenKill(ts, { script: [OPEN, { op: "submitMany", gate: GATE, moves, concurrency: RACERS }] });
  const t = tally(run.results[1] as any[]);
  assert.equal(t.committed.length, 1);
  assert.equal(t.repeat.length, 0);
  assert.equal(t.refused.length, RACERS - 1);
  const winner = t.committed[0].record.key;
  assert.ok(t.refused.every((r: any) => ["lost-race", "stale"].includes(r.reason) && r.winner === winner), "each loser names the winner");
  const i = await inspectStore(ts.store, GATE);
  assert.equal(i.records.length, 1);
  assert.equal(i.records[0].key, winner);
  assert.deepEqual(checkInvariants(i), []);
}));

test("conflict, stale, invalid (all four kinds) and unknown gate — each refused by name, and the one record never changes", () => withStore(async (ts) => {
  const run = await runThenKill(ts, { script: [
    OPEN,
    { op: "submit", gate: GATE, key: "m1", move: mv() },
    { op: "submit", gate: GATE, key: "m1", move: mv({ kind: "reject" }) },                 // 2 key-conflict
    { op: "submit", gate: GATE, key: "m2", move: mv({ kind: "revise" }) },                 // 3 stale
    { op: "submit", gate: GATE, key: "m3", move: mv({ decidedBy: " " }) },                 // 4 invalid: no decider
    { op: "submit", gate: GATE, key: "m4", move: mv({ kind: "restart" }) },                // 5 invalid: kind outside the vocabulary
    { op: "submit", gate: GATE, key: "m5", move: mv({ briefRef: "" }) },                   // 6 invalid: no brief
    { op: "submit", gate: GATE, key: "m6", move: mv({ briefRef: briefRef({ other: 1 }) }) }, // 7 invalid: another brief
    { op: "submit", gate: "gate:nope:gate0:1", key: "m7", move: mv() },                    // 8 unknown gate
  ] });
  const r = run.results as any[];
  assert.equal(r[1].status, "committed");
  assert.deepEqual([r[2].reason, r[2].original], ["key-conflict", "m1"]);
  assert.deepEqual([r[3].reason, r[3].winner], ["stale", "m1"]);
  for (const n of [4, 5, 6, 7]) assert.equal(r[n].reason, "invalid-move", JSON.stringify(r[n]));
  assert.equal(r[8].reason, "unknown-gate");
  const i = await inspectStore(ts.store, GATE);
  assert.equal(i.records.length, 1);
  assert.equal(i.records[0].key, "m1");
  assert.equal(i.records[0].move.kind, "approve");
  assert.equal((await inspectStore(ts.store, "gate:nope:gate0:1")).documents.gate, false, "no gate was created by a move");
  assert.deepEqual(checkInvariants(i), []);
}));

test("a move during start-up is not-ready, and the same key succeeds once ready", () => withStore(async (ts) => {
  await runThenKill(ts, { script: [OPEN] });
  const run = await runThenKill(ts, { script: [{ op: "early", gate: GATE, key: "m1", move: mv() }], holdAt: "wait.before-register", holdMs: 500 });
  const { before, after } = (run.results[0] as { before: any; after: any });
  assert.deepEqual([before.status, before.reason], ["refused", "not-ready"]);
  assert.equal(after.status, "committed");
  const i = await inspectStore(ts.store, GATE);
  assert.equal(i.records.length, 1);
  assert.deepEqual(checkInvariants(i), []);
}));

test("an injected store failure at the moment of writing: refused store-error, the gate still waiting, no record — even after a restart — then the same key commits without the fault", () => withStore(async (ts) => {
  const failed = await runThenKill(ts, { faultAt: "store-write", script: [OPEN, { op: "submit", gate: GATE, key: "m1", move: mv() }, { op: "state", gate: GATE }] });
  const [, r, st] = failed.results as any[];
  assert.deepEqual([r.status, r.reason], ["refused", "store-error"]);
  assert.deepEqual(st, { state: "waiting" });
  const wreck = await inspectStore(ts.store, GATE);
  assert.equal(wreck.records.length, 0);
  assert.deepEqual(checkInvariants(wreck), []);
  const retry = await runThenKill(ts, { script: [{ op: "submit", gate: GATE, key: "m1", move: mv() }] });
  assert.equal((retry.results[0] as any).status, "committed", "the failed attempt left no trace: the same key commits");
  const done = await inspectStore(ts.store, GATE);
  assert.equal(done.records.length, 1);
  assert.deepEqual(checkInvariants(done), []);
}));
