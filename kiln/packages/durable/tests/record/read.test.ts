// r15 T057 (US5): the read path refuses what it cannot understand, by name, and never guesses. A newer version than the catalog knows fails the read; an unknown interim type is presented as
// record.unknown (its name and a digest only) and is never turned into a known type.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EventVersionUnknown } from "#contracts/events/upcast.ts";
import { appendEvent, type EventChunk } from "#durable/record/append.ts";
import { collect, fromReader, readRecord } from "#durable/record/read.ts";
import { draft, withStore } from "./support.ts";

test("an event stored at a version NEWER than the catalog knows fails the read by name", () => withStore(async (s) => {
  await s.commit((tx) => appendEvent(tx, draft()));
  await s.commit(async (tx) => { const c = await tx.doc<EventChunk>("kiln.event", "0", { events: [] }); c.events[0].schema = "walk.completed/9"; });
  await assert.rejects(collect(readRecord(fromReader(s))), (e: unknown) => e instanceof EventVersionUnknown && /walk\.completed\/9/.test((e as Error).message) && /event-version-unknown/.test((e as Error).message));
}));

test("an interim entry of a type nobody knows is read as record.unknown — never as a known type, and without its data", () => withStore(async (s) => {
  await s.commit(async (tx) => {
    Object.assign(await tx.doc<object>("kiln.outbox", "main", {}), {
      next: 3,
      entries: [
        { type: "something.else", subject: "x", at: 1_700_000_000_000, actor: "system", cause: "k1", data: { secret: "do not copy me" }, seq: 1 },
        { type: "gate.opened.v2-from-the-future", subject: "x", at: 1_700_000_000_001, actor: "system", cause: "k2", data: { briefRef: "b", gateKey: "3-spec" }, seq: 2 },
      ],
    });
  });
  const events = await collect(readRecord(fromReader(s)));
  assert.deepEqual(events.map((e) => e.type), ["record.unknown", "record.unknown"]);
  assert.deepEqual(events.map((e) => (e.data as { originalType: string }).originalType), ["something.else", "gate.opened.v2-from-the-future"]);
  assert.ok(!JSON.stringify(events).includes("do not copy me"));
}));
