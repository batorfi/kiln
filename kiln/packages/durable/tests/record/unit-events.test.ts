import { test } from "node:test";
import assert from "node:assert/strict";
import { openReader } from "#durable/library/open.ts";
import { collect, fromReader, readRecord } from "#durable/record/read.ts";
import { PLAIN, drive, withFactory } from "../walk/support.ts";

const unitEvents = async (f: Parameters<Parameters<typeof withFactory>[0]>[0]) => (await f.inspect()).outbox.filter((e) => e.type.startsWith("unit."));
async function until(cond: () => Promise<boolean>, what: string): Promise<void> {
  for (let i = 0; i < 200; i++) { if (await cond()) return; await new Promise((r) => setTimeout(r, 25)); }
  throw new Error(`timed out waiting for ${what}`);
}

test("a scripted unit gives queued → started → settled, each once, with its label, owner and run", () => withFactory(async (f) => {
  const r = await f.tasks.create("u1", "kiln.unit", { label: "write-spec", steps: 3 } as never, { kind: "factory" });
  assert.equal(r.status, "created");
  await until(async () => (await unitEvents(f)).some((e) => e.type === "unit.settled"), "the unit to settle");
  const ev = await unitEvents(f);
  assert.deepEqual(ev.map((e) => e.type), ["unit.queued", "unit.started", "unit.settled"]);
  const id = (r as { id: number }).id;
  for (const e of ev) {
    assert.deepEqual(e.data, { unit: id, label: "write-spec", owner: "factory" });
    assert.equal(e.subject, `unit:${id}`);
  }
  assert.deepEqual([ev[0].actor, ev[0].cause], ["system", "u1"], "queued is caused by the command that created the unit");
  assert.deepEqual([ev[1].actor, ev[1].cause], [`task:${id}`, `task:${id}`]);
}));

test("the units of a row's script carry the row's run; a bare unit carries none", () => withFactory(async (f, store) => {
  await f.tasks.create("r1", "kiln.row", { feature: "scripted", script: [{ label: "a", steps: 1 }, { label: "b", steps: 1 }] } as never, { kind: "factory" });
  await f.tasks.create("u1", "kiln.unit", { label: "bare", steps: 1 } as never, { kind: "factory" });
  await until(async () => (await unitEvents(f)).filter((e) => e.type === "unit.settled").length === 3, "three units to settle");
  const reader = await openReader(store);
  const full = await collect(readRecord(fromReader(reader)));
  await reader.close();
  const byLabel = (l: string) => full.filter((e) => e.type.startsWith("unit.") && (e.data as { label: string }).label === l);
  assert.ok(byLabel("a").every((e) => e.correlation === "run:scripted" && (e.data as { owner: string }).owner.startsWith("task:")));
  assert.ok(byLabel("b").every((e) => e.correlation === "run:scripted"));
  assert.ok(byLabel("bare").every((e) => e.correlation === null));
}));

test("every unit a walk runs is queued, started and settled exactly once, in the walk's run", () => withFactory(async (f) => {
  await f.walks.admit("k1", "w", PLAIN);
  const d = await drive(f, "w");
  assert.equal(d.last.status, "done");
  const ev = (await unitEvents(f)).filter((e) => e.type !== undefined);
  const units = new Set(ev.map((e) => (e.data as { unit: number }).unit));
  assert.equal(units.size, (await f.tasks.list()).filter((t) => t.kind === "kiln.unit").length, "an event trail for every unit task the walk created, and for no other");
  assert.ok(units.size >= 10, `${units.size} units`);
  for (const u of units) {
    const mine = ev.filter((e) => (e.data as { unit: number }).unit === u).map((e) => e.type);
    assert.deepEqual(mine, ["unit.queued", "unit.started", "unit.settled"], `unit ${u}`);
  }
}));
