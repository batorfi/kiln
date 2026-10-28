import { test } from "node:test";
import assert from "node:assert/strict";
import { appendEvent, CHUNK, EventRejected, type EventChunk, type RecordHead } from "#durable/record/append.ts";
import { collect, fromReader, headOf, readRecord, readRun } from "#durable/record/read.ts";
import { draft, withStore } from "./support.ts";

test("700 appends cross two chunk boundaries with a gap-free sequence", () => withStore(async (s) => {
  for (let i = 0; i < 700; i++) await s.commit((tx) => appendEvent(tx, draft()));
  const head = await s.snapshot<RecordHead>("kiln.record", "head");
  assert.deepEqual([head?.next, head?.legacyThrough], [701, 0]);
  const events = await collect(readRecord(fromReader(s)));
  assert.equal(events.length, 700);
  events.forEach((e, i) => assert.equal(e.seq, i + 1));
  assert.equal((await s.snapshot<EventChunk>("kiln.event", "0"))?.events.length, CHUNK);
  assert.equal((await s.snapshot<EventChunk>("kiln.event", "1"))?.events.length, CHUNK);
  assert.equal((await s.snapshot<EventChunk>("kiln.event", "2"))?.events.length, 700 - 2 * CHUNK);
  assert.equal(new Set(events.map((e) => e.id)).size, 700, "ids are unique");
}));

test("an event has a complete envelope", () => withStore(async (s) => {
  const e = await s.commit((tx) => appendEvent(tx, draft({ subject: "gate:demo:3-spec:2", type: "gate.opened", data: { briefRef: "b1", gateKey: "3-spec", round: 2 }, cause: "open-key" })));
  assert.deepEqual([e.seq, e.type, e.schema, e.correlation, e.causation, e.trace, e.privacy], [1, "gate.opened", "gate.opened/1", "run:demo", "cmd:open-key", null, "internal"]);
  assert.match(e.id, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.match(e.time, /^2026-10-28T10:\d\d:\d\d\.000Z$/);
}));

test("a rejected event rolls the whole commit back: the document, the head and the chunk are unchanged", () => withStore(async (s) => {
  await s.commit((tx) => appendEvent(tx, draft()));
  const before = JSON.stringify([await s.snapshot("kiln.record", "head"), await s.snapshot("kiln.event", "0")]);
  await assert.rejects(
    s.commit(async (tx) => {
      const d = await tx.doc<{ v?: number }>("kiln.gate", "g", {});
      d.v = 1; // state the event would have recorded
      await appendEvent(tx, draft({ data: { approved: [], note: "no" } }));
    }),
    (e: unknown) => e instanceof EventRejected && e.code === "event-field-forbidden",
  );
  assert.equal(await s.snapshot("kiln.gate", "g"), undefined, "the document the event would have recorded was not written");
  assert.equal(JSON.stringify([await s.snapshot("kiln.record", "head"), await s.snapshot("kiln.event", "0")]), before);
}));

test("a store r13/r14 wrote: numbering continues after kiln.outbox/main, which is never touched", () => withStore(async (s) => {
  const entries = Array.from({ length: 7 }, (_, i) => ({ type: "gate.opened", subject: `gate:f:g${i}:1`, at: 1_700_000_000_000 + i, actor: "task:1", cause: `k${i}`, data: { briefRef: "b", gateKey: "3-spec" }, seq: i + 1 }));
  await s.commit(async (tx) => { Object.assign(await tx.doc<object>("kiln.outbox", "main", {}), { next: 8, entries }); });
  const legacyBefore = JSON.stringify(await s.snapshot("kiln.outbox", "main"));
  const e = await s.commit((tx) => appendEvent(tx, draft()));
  assert.equal(e.seq, 8);
  assert.equal(JSON.stringify(await s.snapshot("kiln.outbox", "main")), legacyBefore, "the legacy document is byte-identical");
  assert.deepEqual(await headOf(fromReader(s)), { next: 9, legacyThrough: 7 });
  const all = await collect(readRecord(fromReader(s)));
  assert.deepEqual(all.map((x) => x.seq), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(all[0].schema, "gate.opened/1", "a version 0 entry is presented at the current version");
  assert.equal((await s.snapshot<EventChunk>("kiln.event", "0"))?.events.length, 1, "only the new event is in a chunk");
}));

test("a run is read through its index, and includes the run's entries from before the new owner", () => withStore(async (s) => {
  const entries = [
    { type: "walk.completed", subject: "f", at: 1_700_000_000_000, actor: "human@x", cause: "k1", data: { approved: [] }, seq: 1 },
    { type: "walk.completed", subject: "other", at: 1_700_000_000_001, actor: "human@x", cause: "k2", data: { approved: [] }, seq: 2 },
  ];
  await s.commit(async (tx) => { Object.assign(await tx.doc<object>("kiln.outbox", "main", {}), { next: 3, entries }); });
  await s.commit((tx) => appendEvent(tx, draft({ subject: "f" })));
  await s.commit((tx) => appendEvent(tx, draft({ subject: "other" })));
  await s.commit((tx) => appendEvent(tx, draft({ subject: "f" })));
  assert.deepEqual((await collect(readRun(fromReader(s), "f"))).map((e) => e.seq), [1, 3, 5]);
  assert.deepEqual((await collect(readRun(fromReader(s), "other"))).map((e) => e.seq), [2, 4]);
  assert.deepEqual(await collect(readRun(fromReader(s), "nobody")), []);
}));

test("a range read returns just the range; an empty record reads empty", () => withStore(async (s) => {
  assert.deepEqual(await collect(readRecord(fromReader(s))), []);
  for (let i = 0; i < 10; i++) await s.commit((tx) => appendEvent(tx, draft()));
  assert.deepEqual((await collect(readRecord(fromReader(s), { from: 4, to: 6 }))).map((e) => e.seq), [4, 5, 6]);
  assert.deepEqual(await collect(readRecord(fromReader(s), { from: 11 })), []);
}));
