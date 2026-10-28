// r13 T064 — the lane in one process (spec US6, FR-030 … FR-032, LANE-1): one holder at a time, FIFO waiting, the lane's facts changed in the SAME commit as the entries that record them, a swap counted
// only when a resident model really changes, a lease left by a dead generation released at start, and ONE lane task for the life of the store.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openFactory, type Factory } from "#durable/factory.ts";
import type { Hooks } from "#durable/hooks.ts";
import { createLane, LaneError } from "../src/lane-task.ts";

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const pending = (p: Promise<unknown>): Promise<boolean> => Promise.race([p.then(() => false, () => false), tick(60).then(() => true)]);

async function withLane(run: (ctx: { factory: Factory; api: ReturnType<typeof createLane>["api"]; store: string; reopen(hooks?: Hooks): Promise<Factory> }) => Promise<void>, hooks?: Hooks): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k13lane-"));
  const store = join(dir, "s");
  const opened: Factory[] = [];
  const open = async (h?: Hooks) => {
    const lane = createLane();
    const f = await openFactory({ store, lane: lane.api, tasks: lane.kinds, hooks: h });
    opened.push(f);
    return Object.assign(f, { __api: lane.api });
  };
  try {
    const f = (await open(hooks)) as Factory & { __api: ReturnType<typeof createLane>["api"] };
    await f.ready;
    await run({ factory: f, api: f.__api, store, reopen: async (h) => { await opened[opened.length - 1].close(); const g = await open(h); await g.ready; return g; } });
  } finally {
    for (const f of opened) await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}
const lane = async (f: Factory) => (await f.inspect()).lane;
const entries = async (f: Factory) => (await f.inspect()).outbox.filter((e) => e.type.startsWith("lane."));

test("free → acquire → held → release → free, each change recorded with its actor and cause", () => withLane(async ({ factory, api }) => {
  assert.deepEqual(await lane(factory), { holders: 0, resident: null, hold: false, swaps: 0 });
  const lease = await api.acquire(11, { model: "m1", hold: true, cause: "unit:11/step:0" });
  assert.equal(lease.holder, 11);
  assert.deepEqual(await lane(factory), { holders: 1, resident: "m1", hold: true, swaps: 0 });
  await api.release(11);
  assert.deepEqual(await lane(factory), { holders: 0, resident: "m1", hold: true, swaps: 0 }, "released: nobody holds it, the resident model stays");
  const e = await entries(factory);
  assert.deepEqual(e.map((x) => [x.type, x.actor, x.cause]), [["lane.acquired", "task:11", "unit:11/step:0"], ["lane.released", "task:11", "task:11"]]);
}));

test("a second acquire WAITS and is granted on release, in the order they asked", () => withLane(async ({ factory, api }) => {
  await api.acquire(1, { model: "m1" });
  const second = api.acquire(2, { model: "m1" });
  const third = api.acquire(3, { model: "m1" });
  assert.equal(await pending(second), true, "the second waits");
  assert.equal((await lane(factory)).holders, 1, "and the store never records two");
  const order: number[] = [];
  void second.then(() => order.push(2));
  void third.then(() => order.push(3));
  await api.release(1);
  await second;
  assert.equal(await pending(third), true, "the third still waits while the second holds");
  await api.release(2);
  await third;
  await api.release(3);
  assert.deepEqual(order, [2, 3]);
  assert.equal((await lane(factory)).holders, 0);
}));

test("resident, hold and swaps change with the acquire; a swap is counted only when a resident model is REPLACED by a different one", () => withLane(async ({ factory, api }) => {
  await api.acquire(1, { model: "m1" });
  await api.release(1);
  assert.equal((await lane(factory)).swaps, 0, "the first load is not a swap");
  await api.acquire(2, { model: "m1" });
  await api.release(2);
  assert.equal((await lane(factory)).swaps, 0, "asking for the model that is already resident is not a swap");
  await api.acquire(3);
  assert.equal((await lane(factory)).resident, "m1", "no model asked: the resident one stays");
  await api.release(3);
  await api.acquire(4, { model: "m2", hold: true });
  assert.deepEqual(await lane(factory), { holders: 1, resident: "m2", hold: true, swaps: 1 });
  await api.release(4);
  const swapped = (await entries(factory)).filter((e) => e.type === "lane.swapped");
  assert.equal(swapped.length, 1);
  assert.deepEqual(swapped[0].data, { from: "m1", to: "m2", swaps: 1 });
  assert.equal(swapped[0].actor, "task:4");
}));

test("the lane's facts and its entries are ONE commit: a failure at the end of the acquire leaves the lane exactly as it was", async () => {
  let armed = false;
  const hooks: Hooks = { at(p) { if (armed && p === "lane.acquire-after-write") throw new Error("injected"); }, fault() {} };
  await withLane(async ({ factory, api }) => {
    await api.acquire(1, { model: "m1" });
    await api.release(1);
    const before = { lane: await lane(factory), entries: (await entries(factory)).length };
    armed = true;
    await assert.rejects(api.acquire(2, { model: "m2", hold: true }), /injected|store/i);
    armed = false;
    assert.deepEqual(await lane(factory), before.lane, "resident, hold, swaps and the lease: untouched");
    assert.equal((await entries(factory)).length, before.entries, "and no entry was written");
    const ok = await api.acquire(3, { model: "m2" });
    assert.equal(ok.holder, 3, "the lane is not stuck: the next step gets it");
    await api.release(3);
  }, hooks);
});

test("a step that does not hold the lane cannot release it; a waiting step that is aborted never takes it", () => withLane(async ({ factory, api }) => {
  await assert.rejects(api.release(5), (e: unknown) => e instanceof Error && /task 5 does not hold the lane/.test(e.message));
  await api.acquire(1);
  await assert.rejects(api.release(2), /task 2 does not hold the lane \(task 1 does\)/);
  const stop = new AbortController();
  const waiting = api.acquire(2, { signal: stop.signal });
  const behind = api.acquire(3);
  stop.abort();
  await assert.rejects(waiting, LaneError);
  await api.release(1);
  assert.equal((await behind).holder, 3, "the aborted step was skipped");
  assert.equal((await lane(factory)).holders, 1);
  await api.release(3);
}));

test("a lease left by a generation that died with the process is released at start, with an entry; resident, hold and swaps survive; the lane task is created ONCE", () => withLane(async ({ factory, api, reopen }) => {
  await api.acquire(7, { model: "m1" });
  await api.release(7);
  await api.acquire(8, { model: "m2", hold: true }); // swapped; held; the process "dies" now
  const before = await lane(factory);
  assert.deepEqual(before, { holders: 1, resident: "m2", hold: true, swaps: 1 });
  const again = await reopen();
  assert.deepEqual(await lane(again), { holders: 0, resident: "m2", hold: true, swaps: 1 }, "nothing runs; the lane's facts are as they were");
  const rel = (await entries(again)).filter((e) => e.type === "lane.released");
  assert.deepEqual(rel.map((e) => [e.actor, e.cause, (e.data as { holder: number }).holder]), [["task:7", "task:7", 7], ["factory", "restart", 8]]);
  const third = await reopen();
  const tasks = (await third.tasks.list()).filter((t) => t.kind === "kiln.lane");
  assert.equal(tasks.length, 1, "one lane task for the life of the store, however many starts");
  assert.equal(tasks[0].owner, "factory");
  assert.equal((await entries(third)).filter((e) => e.type === "lane.released").length, 2, "a start that finds the lane free adds nothing");
}));

test("a unit that needs the lane holds it for its generation and releases it; two such units never overlap", () => withLane(async ({ factory }) => {
  const mk = (key: string, label: string, model: string) => factory.tasks.create(key, "kiln.unit", { label, steps: 2, stepMs: 40, needsLane: true, model }, { kind: "factory" });
  const [a, b] = await Promise.all([mk("a", "gen-a", "m1"), mk("b", "gen-b", "m2")]);
  assert.ok(a.status === "created" && b.status === "created");
  for (let i = 0; i < 100; i++) {
    const t = (await factory.tasks.list()).filter((x) => x.kind === "kiln.unit");
    if (t.length === 2 && t.every((x) => x.status === "terminal")) break;
    await tick(50);
  }
  const units = (await factory.tasks.list()).filter((x) => x.kind === "kiln.unit");
  assert.ok(units.every((u) => u.status === "terminal" && u.outcome?.status === "completed"), JSON.stringify(units));
  const e = await entries(factory);
  assert.deepEqual(e.filter((x) => x.type !== "lane.swapped").map((x) => x.type), ["lane.acquired", "lane.released", "lane.acquired", "lane.released", "lane.acquired", "lane.released", "lane.acquired", "lane.released"], "acquire and release alternate: never two at once");
  assert.equal((await lane(factory)).holders, 0);
}));

test("a unit whose step fails while it holds the lane gives the lane back: the next unit is not left waiting", async () => {
  let thrown = 0;
  const hooks: Hooks = { at(p) { if (p === "unit.step-after-work" && thrown++ === 0) throw new Error("injected failure while holding the lane"); }, fault() {} };
  await withLane(async ({ factory }) => {
    const mk = (key: string, label: string) => factory.tasks.create(key, "kiln.unit", { label, steps: 1, needsLane: true }, { kind: "factory" });
    assert.equal((await mk("bad", "first")).status, "created");
    for (let i = 0; i < 100 && (await lane(factory)).holders === 1; i++) await tick(50);
    assert.equal((await lane(factory)).holders, 0, "the failed step released the lane");
    assert.equal((await mk("good", "second")).status, "created");
    for (let i = 0; i < 100; i++) {
      const u = (await factory.tasks.list()).filter((x) => x.kind === "kiln.unit");
      if (u.length === 2 && u.every((x) => x.status === "terminal")) break;
      await tick(50);
    }
    const units = (await factory.tasks.list()).filter((x) => x.kind === "kiln.unit");
    assert.deepEqual(units.map((u) => u.outcome?.status), ["failed", "completed"], JSON.stringify(units));
    const e = (await entries(factory)).map((x) => [x.type, x.actor]);
    assert.deepEqual(e.map((x) => x[0]), ["lane.acquired", "lane.released", "lane.acquired", "lane.released"], "every acquire has its release, the failed one included");
  }, hooks);
});

test("r15: a lane event carries the run of the unit that holds it — a row's unit gives run:<feature>, a bare unit gives none", () => withLane(async ({ factory }) => {
  assert.equal((await factory.tasks.create("r1", "kiln.row", { feature: "scripted", script: [{ label: "a", steps: 1, needsLane: true }] } as never, { kind: "factory" })).status, "created");
  assert.equal((await factory.tasks.create("u1", "kiln.unit", { label: "bare", steps: 1, needsLane: true }, { kind: "factory" })).status, "created");
  for (let i = 0; i < 200; i++) {
    const done = (await factory.tasks.list()).filter((x) => x.kind === "kiln.unit" && x.status === "terminal").length;
    if (done === 2 && (await lane(factory)).holders === 0) break;
    await tick(25);
  }
  const events = (await factory.inspect()).outbox.filter((e) => e.type.startsWith("lane."));
  const holder = (e: { data: unknown }) => (e.data as { holder: number }).holder;
  const holders = [...new Set(events.map(holder))];
  assert.equal(holders.length, 2, "two units took the lane");
  const byRun = new Map(holders.map((h) => [h, [...new Set(events.filter((e) => holder(e) === h).map((e) => e.correlation))]]));
  const runs = [...byRun.values()].map((v) => v.map(String).join("|")).sort();
  assert.deepEqual(runs, ["null", "run:scripted"].sort(), "one holder belonged to the row's run, the other to none");
  assert.ok(events.every((e) => e.subject === "lane"));
}));
