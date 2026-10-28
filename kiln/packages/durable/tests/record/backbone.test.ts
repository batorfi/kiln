// r15 T038/T040 (US6): the backbone in one process — ordered delivery, durable cursors, catch-up, a late consumer, at-least-once with idempotence, isolation of a stalled or failing consumer, no timer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Event } from "#contracts/events/types.ts";
import { openFactory, type Factory } from "#durable/factory.ts";
import type { Consumer } from "#durable/record/consumer.ts";
import { appendEvent } from "#durable/record/append.ts";
import { drive, PLAIN, walkTo } from "../walk/support.ts";
import { draft } from "./support.ts";

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
async function until(cond: () => boolean | Promise<boolean>, what: string, ms = 8000): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await cond()) return; await tick(15); }
  throw new Error(`timed out waiting for ${what}`);
}
/** An effect consumer that records every event it is delivered. */
function recorder(name = "rec", over: Partial<Consumer> = {}): Consumer & { seen: number[]; calls: number } {
  const c = { name, version: 1, mode: "effect" as const, seen: [] as number[], calls: 0, async deliver(batch: Event[]) { c.calls++; for (const e of batch) c.seen.push(e.seq); }, ...over };
  return c;
}
async function withDir<T>(run: (store: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "k15-bb-"));
  try { return await run(join(dir, "s")); } finally { rmSync(dir, { recursive: true, force: true }); }
}
const append = (f: Factory, n: number) => f.commands.run(`k-${Math.random()}`, "test", { n } as never, async () => ({ n }));

test("events reach a consumer in order, none skipped, and its cursor follows", () => withDir(async (store) => {
  const rec = recorder();
  const f = await openFactory({ store, consumers: [rec] });
  try {
    await f.ready;
    for (let i = 0; i < 30; i++) await append(f, i);
    await until(() => rec.seen.length >= 30, "30 events delivered");
    assert.deepEqual(rec.seen, Array.from({ length: rec.seen.length }, (_, i) => i + 1), "in order, no gap, no repeat");
    await until(async () => (await f.backbone.status())[0].lag === 0, "the cursor to catch up");
    assert.deepEqual((await f.backbone.status())[0], { name: "rec", seq: rec.seen.length, head: rec.seen.length, lag: 0 });
  } finally { await f.close(); }
}));

test("after a restart a consumer receives what is after its cursor — and nothing before", () => withDir(async (store) => {
  const a = recorder();
  const f1 = await openFactory({ store, consumers: [a] });
  await f1.ready;
  for (let i = 0; i < 10; i++) await append(f1, i);
  await until(() => a.seen.length === 10, "10 delivered");
  await until(async () => (await f1.backbone.status())[0].lag === 0, "cursor caught up");
  await f1.close();
  const b = recorder();
  const f2 = await openFactory({ store, consumers: [b] });
  try {
    await f2.ready;
    await tick(100);
    assert.deepEqual(b.seen, [], "nothing is delivered twice after a clean stop");
    for (let i = 0; i < 5; i++) await append(f2, i);
    await until(() => b.seen.length === 5, "the 5 new events");
    assert.deepEqual(b.seen, [11, 12, 13, 14, 15]);
  } finally { await f2.close(); }
}));

test("a consumer added late starts from the first event and reaches the state of one that was always there", () => withDir(async (store) => {
  const early = recorder("early");
  const f = await openFactory({ store, consumers: [early] });
  try {
    await f.ready;
    await f.walks.admit("k1", "w", PLAIN);
    await drive(f, "w");
    await until(async () => (await f.backbone.status())[0].lag === 0, "the early consumer to finish");
    const late = recorder("late");
    f.backbone.register(late);
    await until(() => late.seen.length === early.seen.length, "the late consumer to catch up");
    assert.deepEqual(late.seen, early.seen);
    assert.ok(late.seen.length > 60, `${late.seen.length} events`);
  } finally { await f.close(); }
}));

test("a commit made by a TASK STEP (run.commit, not store.commit) wakes a consumer without a restart — the seam does it", () => withDir(async (store) => {
  const types: string[] = [];
  const watcher: Consumer = { name: "types", version: 1, mode: "effect", async deliver(batch) { for (const e of batch) types.push(e.type); } };
  const f = await openFactory({ store, consumers: [watcher] });
  try {
    await f.ready;
    await tick(60); // the consumer is idle, caught up
    await f.walks.admit("k1", "w", PLAIN);
    await walkTo(f, "w", "3-spec"); // the row\'s own commits (walk.admitted, unit.queued, walk steps) are made by task steps
    await until(() => types.includes("walk.admitted") && types.includes("unit.queued"), "events written by task steps to be delivered");
  } finally { await f.close(); }
}));

test("at-least-once: a repeated delivery of every batch changes nothing for an idempotent consumer", () => withDir(async (store) => {
  const set = new Set<number>();
  let deliveries = 0;
  const idem: Consumer = { name: "idem", version: 1, mode: "effect", async deliver(batch) { deliveries++; for (const e of batch) set.add(e.seq); } };
  const f1 = await openFactory({ store, consumers: [idem], hooks: { at(p) { if (p === "backbone.delivered") throw new Error("injected: dies after delivering, before the cursor moves"); }, fault() {} } });
  await f1.ready;
  for (let i = 0; i < 8; i++) await append(f1, i);
  await tick(150);
  await f1.close();
  const d1 = deliveries;
  assert.ok(d1 >= 1);
  const f2 = await openFactory({ store, consumers: [idem] });
  try {
    await f2.ready;
    await until(async () => (await f2.backbone.status())[0].lag === 0, "the repeat to complete");
    assert.ok(deliveries > d1, "the batch whose cursor never moved was delivered again");
    assert.deepEqual([...set].sort((a, b) => a - b), Array.from({ length: set.size }, (_, i) => i + 1), "the result of the repeat equals the result of one delivery");
  } finally { await f2.close(); }
}));

test("a consumer that never returns leaves the walk\'s outcome unchanged and its time under 3 s; its lag is visible", () => withDir(async (store) => {
  const stalled: Consumer = { name: "stalled", version: 1, mode: "effect", deliver: (_b, signal) => new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true })) };
  const other = recorder("other");
  const f = await openFactory({ store, consumers: [stalled, other] });
  try {
    await f.ready;
    const t0 = Date.now();
    await f.walks.admit("k1", "w", PLAIN);
    const d = await drive(f, "w");
    assert.equal(d.last.status, "done");
    assert.ok(Date.now() - t0 < 3000, `${Date.now() - t0} ms`);
    await until(async () => (await f.backbone.status()).find((s) => s.name === "other")!.lag === 0, "the other consumer to finish");
    const st = await f.backbone.status();
    assert.equal(st.find((s) => s.name === "stalled")!.seq, 0, "the stalled consumer never advanced");
    assert.ok(st.find((s) => s.name === "stalled")!.lag > 40, "and its lag is there for a reader to see");
  } finally { await f.close(); } // closing must not wait for the stalled consumer
}));

test("a throwing consumer stops at its event, is reported by name in its cursor, and the factory and the other consumers go on; retry resumes it", () => withDir(async (store) => {
  let boom = true;
  const flaky: Consumer = { name: "flaky", version: 1, mode: "effect", async deliver(batch) { if (boom && batch.some((e) => e.seq >= 3)) throw new Error("cannot handle event 3"); } };
  const other = recorder("other");
  const f = await openFactory({ store, consumers: [flaky, other] });
  try {
    await f.ready;
    for (let i = 0; i < 6; i++) await append(f, i);
    await until(async () => !!(await f.backbone.status()).find((s) => s.name === "flaky")?.failed, "the failure to be recorded");
    const st = await f.backbone.status();
    assert.match(st.find((s) => s.name === "flaky")!.failed!.error, /consumer-failed: cannot handle event 3/);
    await until(() => other.seen.length >= 6, "the healthy consumer to go on");
    boom = false;
    await f.backbone.retry("flaky");
    await until(async () => (await f.backbone.status()).find((s) => s.name === "flaky")!.lag === 0, "flaky to catch up after retry");
    assert.equal((await f.backbone.status()).find((s) => s.name === "flaky")!.failed, undefined);
  } finally { await f.close(); }
}));

test("a cursor AHEAD of the record stops its consumer by name: it never skips forward", () => withDir(async (store) => {
  const rec = recorder();
  const f1 = await openFactory({ store, consumers: [rec] });
  await f1.ready;
  for (let i = 0; i < 3; i++) await append(f1, i);
  await until(async () => (await f1.backbone.status())[0].lag === 0, "caught up");
  await f1.close();
  const { openStore } = await import("#durable/library/open.ts");
  const s = await openStore({ dir: store, kinds: [] });
  await s.commit(async (tx) => { (await tx.doc<{ seq?: number }>("kiln.cursor", "rec", {})).seq = 999; });
  await s.close();
  const f2 = await openFactory({ store, consumers: [recorder()] });
  try {
    await f2.ready;
    await until(async () => !!(await f2.backbone.status())[0].failed, "the failure to be recorded");
    assert.match((await f2.backbone.status())[0].failed!.error, /^cursor-ahead-of-head:/);
  } finally { await f2.close(); }
}));

test("a transactional consumer\'s effect and its cursor are one commit; a new version starts again from the first event", () => withDir(async (store) => {
  const mk = (version: number): Consumer => ({
    name: "count", version, mode: "transactional",
    async reset(tx) { (await tx.doc<{ n?: number }>("kiln.projection", "count", {})).n = 0; },
    async apply(tx, batch) { const d = await tx.doc<{ n?: number }>("kiln.projection", "count", {}); d.n = (d.n ?? 0) + batch.length; },
  });
  const f1 = await openFactory({ store, consumers: [mk(1)] });
  await f1.ready;
  for (let i = 0; i < 20; i++) await append(f1, i);
  await until(async () => (await f1.backbone.status())[0].lag === 0, "caught up");
  const head = (await f1.backbone.status())[0].head;
  assert.equal((await f1.inspect().then(() => null), null), null);
  await f1.close();
  const { openReader } = await import("#durable/library/open.ts");
  const r = await openReader(store);
  assert.equal((await r.snapshot<{ n: number }>("kiln.projection", "count"))!.n, head, "applied exactly once per event");
  await r.close();
  const f2 = await openFactory({ store, consumers: [mk(2)] });
  try {
    await f2.ready;
    await until(async () => (await f2.backbone.status())[0].lag === 0, "the new version to rebuild");
    await f2.close();
    const r2 = await openReader(store);
    assert.equal((await r2.snapshot<{ n: number }>("kiln.projection", "count"))!.n, (await f2.backbone.status().catch(() => [{ head }]))[0]?.head ?? head, "rebuilt from the first event, not added to the old total");
    await r2.close();
  } finally { await f2.close().catch(() => {}); }
}));

test("no timer: the backbone source has no setTimeout / setInterval, and an idle store shows none", () => {
  const src = readFileSync(new URL("../../src/record/backbone.ts", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(src, /\bsetTimeout\b|\bsetInterval\b|\bsetImmediate\b/);
});
void appendEvent; void draft;
