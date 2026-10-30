// The record oracle can FAIL (r15 T032): a clean store is clean, and each hand-made corruption is named by its invariant.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openFactory } from "#durable/factory.ts";
import { openStore } from "#durable/library/open.ts";
import type { EventChunk } from "#durable/record/append.ts";
import { checkRecordInvariants } from "../proof/support/record-oracle.ts";
import { drive, PLAIN } from "../walk/support.ts";

/** A finished plain walk, closed; `corrupt` edits a COPY of its store. */
async function withWalkStore(corrupt: (dir: string) => Promise<void>): Promise<string[]> {
  const base = mkdtempSync(join(tmpdir(), "k15-oracle-"));
  try {
    const f = await openFactory({ store: join(base, "s") });
    await f.ready;
    await f.walks.admit("k1", "f", PLAIN);
    assert.equal((await drive(f, "f")).last.status, "done");
    await f.close();
    cpSync(join(base, "s"), join(base, "c"), { recursive: true });
    await corrupt(join(base, "c"));
    return await checkRecordInvariants(join(base, "c"));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}
const edit = async (dir: string, f: (tx: import("#durable/store.ts").Tx) => Promise<void>) => {
  const s = await openStore({ dir, kinds: [] });
  await s.commit(f);
  await s.close();
};

test("a finished walk's record is clean: E1, E2, E3 and E7 all hold", async () => assert.deepEqual(await withWalkStore(async () => {}), []));

test("E1: an event removed from the middle of a chunk is a gap; a head that is not N+1 is named", async () => {
  const v = await withWalkStore((dir) => edit(dir, async (tx) => { const c = await tx.doc<EventChunk>("kiln.event", "0", { events: [] }); c.events.splice(5, 1); }));
  assert.ok(v.some((x) => x.startsWith("E1")), JSON.stringify(v));
});
test("E2: an event whose data does not match its schema is named", async () => {
  const v = await withWalkStore((dir) => edit(dir, async (tx) => { const c = await tx.doc<EventChunk>("kiln.event", "0", { events: [] }); (c.events[3].data as Record<string, unknown>).surprise = 1; }));
  assert.ok(v.some((x) => x.startsWith("E2") && x.includes("event-data-invalid")), JSON.stringify(v));
});
test("E3: an event with no actor is named", async () => {
  const v = await withWalkStore((dir) => edit(dir, async (tx) => { const c = await tx.doc<EventChunk>("kiln.event", "0", { events: [] }); c.events[2].actor = ""; }));
  assert.ok(v.some((x) => x.startsWith("E3")), JSON.stringify(v));
});
test("E7: a gate document whose gate.opened event is gone is named — and so is an event with no gate", async () => {
  const gone = await withWalkStore((dir) => edit(dir, async (tx) => {
    const c = await tx.doc<EventChunk>("kiln.event", "0", { events: [] });
    const i = c.events.findIndex((e) => e.type === "gate.opened");
    c.events[i] = { ...c.events[i], subject: "gate:f:ghost:1" }; // an opened gate nobody has a document for — and the real gate lost its event
  }));
  assert.ok(gone.filter((x) => x.startsWith("E7")).length >= 2, JSON.stringify(gone));
});
test("E7: a unit task with no unit.settled event, and a walk outcome with no event, are named", async () => {
  const v = await withWalkStore((dir) => edit(dir, async (tx) => {
    const c = await tx.doc<EventChunk>("kiln.event", "0", { events: [] });
    for (const type of ["unit.settled", "walk.completed"]) { const i = c.events.findIndex((e) => e.type === type); c.events[i] = { ...c.events[i], type: "unit.queued" === type ? type : "walk.fix-round", data: { kind: "mitigate", n: 1, cap: 2, verdict: "pass", pass: 1 } } as never; }
  }));
  assert.ok(v.some((x) => x.startsWith("E7") && /unit \d+/.test(x)), JSON.stringify(v));
  assert.ok(v.some((x) => x.startsWith("E7") && /walk f/.test(x)), JSON.stringify(v));
});
