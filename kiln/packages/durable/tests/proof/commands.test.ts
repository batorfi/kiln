// r13 T061 — every command happens once (spec US5, FR-021, CORE-5): the same key repeated 100 times at once, and 100 times more after a SIGKILL and a restart, creates ONE task and answers `repeat` 199
// times; the same key with another request is a `key-conflict` and writes nothing; gate opens and moves obey the same rule; and from a fresh reader's side every key maps to one request hash (I9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { briefRef } from "#durable/canonical.ts";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants } from "./support/oracle.ts";
import { makeStore, runThenKill } from "./support/harness.ts";

const N = 100;
const FACTORY = { kind: "factory" };
const UNIT = { label: "scan", steps: 2, stepMs: 20 };
const GATE = "gate:demo:gate0:1";
const BRIEF = { title: "Roadmap" };
const spec = (over: Record<string, unknown> = {}) => ({ gateId: GATE, gateKey: "gate0", flow: "v2", brief: BRIEF, openedBy: "factory", ...over });
const tally = (rs: any[]) => ({ created: rs.filter((r) => r.status === "created"), repeat: rs.filter((r) => r.status === "repeat"), refused: rs.filter((r) => r.status === "refused") });

test(`task.create: ${N} at once → 1 created and ${N - 1} repeat; ${N} more after a SIGKILL and restart → ${N} repeat; ONE task in all, with one id`, async () => {
  const ts = makeStore();
  try {
    const first = await runThenKill(ts, { script: [{ op: "createMany", key: "u1", kind: "kiln.unit", input: UNIT, owner: FACTORY, count: N }] });
    const t1 = tally(first.results[0] as any[]);
    assert.deepEqual([t1.created.length, t1.repeat.length, t1.refused.length], [1, N - 1, 0]);
    const id = t1.created[0].id;
    assert.ok(t1.repeat.every((r: any) => r.id === id), "every repeat names the same task");
    const second = await runThenKill(ts, { script: [{ op: "createMany", key: "u1", kind: "kiln.unit", input: UNIT, owner: FACTORY, count: N }, { op: "sleep", ms: 300 }] });
    const t2 = tally(second.results[0] as any[]);
    assert.deepEqual([t2.created.length, t2.repeat.length, t2.refused.length], [0, N, 0]);
    assert.ok(t2.repeat.every((r: any) => r.id === id));
    const i = await inspectStore(ts.store);
    assert.equal(i.tasks.filter((t) => t.kind === "kiln.unit").length, 1, "one task, however many times the command arrived");
    assert.deepEqual(i.commands.u1?.length, 1, "one request hash under the key (I9)");
    assert.deepEqual(checkInvariants(i), []);
  } finally {
    ts.cleanup();
  }
});

test("the same key with ANOTHER request is a key-conflict naming the key, and writes nothing — before and after a restart", async () => {
  const ts = makeStore();
  try {
    const a = await runThenKill(ts, { script: [
      { op: "createTask", key: "k1", kind: "kiln.unit", input: UNIT, owner: FACTORY },
      { op: "createTask", key: "k1", kind: "kiln.unit", input: { ...UNIT, steps: 3 }, owner: FACTORY },
      { op: "createTask", key: "k1", kind: "kiln.row", input: { feature: "f", script: [] }, owner: FACTORY },
    ] });
    const [created, conflictInput, conflictKind] = a.results as any[];
    assert.equal(created.status, "created");
    assert.deepEqual([conflictInput.status, conflictInput.reason, conflictInput.original], ["refused", "key-conflict", "k1"]);
    assert.deepEqual([conflictKind.status, conflictKind.reason], ["refused", "key-conflict"]);
    const b = await runThenKill(ts, { script: [{ op: "createTask", key: "k1", kind: "kiln.unit", input: { ...UNIT, steps: 4 }, owner: FACTORY }, { op: "createTask", key: "k1", kind: "kiln.unit", input: UNIT, owner: FACTORY }] });
    assert.equal((b.results[0] as any).reason, "key-conflict");
    assert.deepEqual([(b.results[1] as any).status, (b.results[1] as any).id], ["repeat", created.id]);
    const i = await inspectStore(ts.store);
    assert.equal(i.tasks.filter((t) => t.kind === "kiln.unit" || t.kind === "kiln.row").length, 1, "the conflicts created nothing");
    assert.deepEqual(i.commands.k1?.length, 1);
    assert.deepEqual(checkInvariants(i), []);
  } finally {
    ts.cleanup();
  }
});

test("gate.open and gate.move keys obey the same rule: a repeat is a repeat, another request under the key is a key-conflict, before and after a restart", async () => {
  const ts = makeStore();
  try {
    const ref = briefRef(BRIEF);
    const mv = (over: Record<string, unknown> = {}) => ({ kind: "approve", decidedBy: "person@example", briefRef: ref, ...over });
    const a = await runThenKill(ts, { script: [
      { op: "open", key: "o1", spec: spec() },
      { op: "open", key: "o1", spec: spec() },                                // repeat
      { op: "open", key: "o1", spec: spec({ openedBy: "someone-else" }) },     // same key, another request
      { op: "open", key: "o2", spec: spec() },                                // another key for the same gate
      { op: "submit", gate: GATE, key: "m1", move: mv() },
      { op: "submit", gate: GATE, key: "m1", move: mv() },                     // repeat
      { op: "submit", gate: GATE, key: "m1", move: mv({ kind: "reject" }) },   // same key, another move
    ] });
    const r = a.results as any[];
    assert.equal(r[0].status, "opened");
    assert.equal(r[1].status, "repeat");
    assert.deepEqual([r[2].reason, r[2].original], ["key-conflict", "o1"]);
    assert.deepEqual([r[3].reason, r[3].original], ["key-conflict", "o1"]);
    assert.equal(r[4].status, "committed");
    assert.equal(r[5].status, "repeat");
    assert.equal(r[6].reason, "key-conflict");
    const b = await runThenKill(ts, { script: [{ op: "open", key: "o1", spec: spec() }, { op: "submit", gate: GATE, key: "m1", move: mv() }, { op: "submit", gate: GATE, key: "m1", move: mv({ kind: "reject" }) }] });
    const s = b.results as any[];
    assert.deepEqual([s[0].status, s[1].status, s[2].reason], ["repeat", "repeat", "key-conflict"]);
    const i = await inspectStore(ts.store, GATE);
    assert.equal(i.records.length, 1);
    assert.equal(i.outbox.filter((e) => e.type === "gate.opened").length, 1);
    for (const [key, hashes] of Object.entries(i.commands)) assert.equal(hashes.length, 1, `key ${key} maps to ${hashes.length} request hashes`);
    assert.deepEqual(Object.keys(i.commands), ["o1"], "the open key is in the ledger, and only it: o2 was refused and left nothing, and a move keeps its key in its own record (the scan is not vacuous)");
    assert.equal(i.records[0].key, "m1");
    assert.deepEqual(checkInvariants(i), []);
  } finally {
    ts.cleanup();
  }
});
