// r15 T067 (SC-009, CORE-7) — the record's size and what it costs, MEASURED, with the method stated. Run on demand (not in the suite): `node tests/measure/record.ts [events]`.
//   1. bytes per event and per full interface walk (the walk's record, read back and serialised)
//   2. append latency on the chunked layout at 10^3 / 10^4 / 10^5 events (one event per commit, like a gate's own commits) — compare tests/measure/outbox-baseline.ts (one growing document)
//   3. a generated record of a busy factory's year: 12 gates x ~21 features a week x 52 weeks, each feature with its gate, move, settlement, unit and command events (~10^5 events)
//        · time to read the whole record, and to fold every run into its factory-log in memory
//        · time for a FRESH owner's factory-log consumer to catch up from the first event (the live projection, writing every run's file)
//   4. the archive of one interface walk: bytes on disk, and the store before/after archiving
import { mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileOf, foldRun } from "#record/projections/factory-log.ts";
import { openFactory } from "#durable/factory.ts";
import { openReader, openStore } from "#durable/library/open.ts";
import { appendEvent } from "#durable/record/append.ts";
import { collect, fromReader, headOf, readRecord, readRun } from "#durable/record/read.ts";
import { drive, INTERFACE } from "../../packages/durable/tests/walk/support.ts";

const target = Number(process.argv[2] ?? 100_000);
const out = (k: string, v: unknown): void => console.log(JSON.stringify({ [k]: v }));
const dirSize = (dir: string): number => readdirSync(dir).reduce((n, f) => { const p = join(dir, f); return n + (statSync(p).isDirectory() ? dirSize(p) : statSync(p).size); }, 0);
const storeBytes = (dir: string): number => readdirSync(dir).filter((f) => f.startsWith("factory.sqlite")).reduce((n, f) => n + statSync(join(dir, f)).size, 0);
const T0 = Date.UTC(2026, 0, 1);

// ── 1 + 4: one interface walk, its record, its archive ──
{
  const dir = mkdtempSync(join(tmpdir(), "k15-meas-"));
  const store = join(dir, "s");
  const f = await openFactory({ store });
  await f.ready;
  await f.walks.admit("k1", "w", INTERFACE);
  await drive(f, "w", (g) => ({ kind: "approve", decidedBy: "human@r15-script", ...(g.gateKey === "gate0" ? { admit: {} } : {}) }));
  let name = "";
  for (let i = 0; i < 400 && !name; i++) { name = ((await f.inspect()).outbox.find((e) => e.type === "feature.archived")?.data as { archive?: string } | undefined)?.archive ?? ""; if (!name) await new Promise((r) => setTimeout(r, 25)); }
  await f.close();
  const r = await openReader(store);
  const events = await collect(readRecord(fromReader(r)));
  await r.close();
  const bytes = events.reduce((n, e) => n + Buffer.byteLength(JSON.stringify(e), "utf8"), 0);
  out("interfaceWalkRecord", { events: events.length, bytes, bytesPerEvent: Math.round(bytes / events.length) });
  out("interfaceWalkArchive", { file: name, bytes: statSync(join(store, "archive", name)).size, storeBytesAfter: storeBytes(store) });
  rmSync(dir, { recursive: true, force: true });
}

// ── 2: append latency on chunks — twice: ONE run of 100 000 events (not a realistic run: it shows the cost of the per-run index, which grows with the run), and runs of ~90 events (a feature) ──
for (const runLength of [Infinity, 90]) {
  const dir = mkdtempSync(join(tmpdir(), "k15-meas-"));
  const s = await openStore({ dir, kinds: [] });
  let n = 0;
  const one = (i: number) => s.commit((tx) => appendEvent(tx, { type: "walk.completed", subject: runLength === Infinity ? "f" : `f${Math.floor(i / runLength)}`, at: T0 + i, actor: "human@r15-script", cause: `k${i}`, data: { approved: ["1-concept"] } }));
  for (const goal of [1_000, 10_000, 100_000]) {
    const t0 = performance.now();
    const batch = goal - n;
    for (let i = 0; i < batch; i++) await one(n + i);
    n = goal;
    const avg = (performance.now() - t0) / batch;
    const t1 = performance.now();
    await one(n++);
    out("appendOnChunks", { runLength: runLength === Infinity ? "one run" : runLength, events: n, avgMsOverLastBatch: +avg.toFixed(3), nextSingleMs: +(performance.now() - t1).toFixed(3), storeBytes: storeBytes(dir) });
  }
  await s.close();
  rmSync(dir, { recursive: true, force: true });
}

// ── 3: a generated year ──
{
  const dir = mkdtempSync(join(tmpdir(), "k15-meas-"));
  const store = join(dir, "s");
  const s = await openStore({ dir: store, kinds: [] });
  const GATES = ["gate0", "1-concept", "2-architecture", "2a-experience", "3-spec", "4-plan", "5-checkpoint", "6-review", "6a-ui-review", "7-verification", "8-docs", "9-pr"];
  let total = 0;
  let features = 0;
  const gen0 = performance.now();
  for (let f = 0; total < target; f++, features++) {
    const feature = `f${f}`;
    await s.commit(async (tx) => {
      let t = T0 + f * 60_000;
      const at = () => (t += 1000);
      for (const [gi, key] of GATES.entries()) {
        const gate = `gate:${feature}:${key}:1`;
        await appendEvent(tx, { type: "command.accepted", subject: "factory", at: at(), actor: "factory", cause: `open:${feature}:${key}`, data: { kind: "gate.open", requestHash: "a".repeat(64) } });
        await appendEvent(tx, { type: "gate.opened", subject: gate, at: at(), actor: "task:1", cause: `open:${feature}:${key}`, data: { briefRef: "b".repeat(64), gateKey: key, flow: "v2", round: 1 } });
        await appendEvent(tx, { type: "unit.queued", subject: `unit:${f * 100 + gi}`, at: at(), actor: "task:1", cause: "task:1", correlation: `run:${feature}`, data: { unit: f * 100 + gi, label: `author:${key}:1`, owner: "task:1" } });
        await appendEvent(tx, { type: "unit.settled", subject: `unit:${f * 100 + gi}`, at: at(), actor: `task:${f * 100 + gi}`, cause: `task:${f * 100 + gi}`, correlation: `run:${feature}`, data: { unit: f * 100 + gi, label: `author:${key}:1`, owner: "task:1" } });
        await appendEvent(tx, { type: "move.committed", subject: gate, at: at(), actor: "human@gen", cause: `m:${gate}`, data: { kind: "approve", decidedBy: "human@gen", briefRef: "b".repeat(64) } });
        await appendEvent(tx, { type: "gate.settled", subject: gate, at: at(), actor: "factory", cause: `m:${gate}`, data: { key: `m:${gate}`, move: "approve", decidedBy: "human@gen" } });
        total += 6;
      }
      await appendEvent(tx, { type: "walk.completed", subject: feature, at: at(), actor: "human@gen", cause: `m:gate:${feature}:9-pr:1`, data: { approved: GATES.slice(1) } });
      total += 1;
    });
  }
  const genMs = performance.now() - gen0;
  await s.close();
  out("generatedYear", { events: total, features, generationMs: Math.round(genMs), storeBytes: storeBytes(store), bytesPerEvent: Math.round(storeBytes(store) / total) });

  const r = await openReader(store);
  const t0 = performance.now();
  const all = await collect(readRecord(fromReader(r)));
  const readMs = performance.now() - t0;
  const t1 = performance.now();
  let lines = 0;
  for (let f = 0; f < features; f++) lines += foldRun(await collect(readRun(fromReader(r), `f${f}`))).length;
  const foldMs = performance.now() - t1;
  const head = await headOf(fromReader(r));
  await r.close();
  out("generatedYearRead", { events: all.length, head: head.next - 1, readWholeRecordMs: Math.round(readMs), foldEveryRunMs: Math.round(foldMs), factoryLogLines: lines });

  // the live projection: a FRESH owner's factory-log consumer catches up from the first event and writes every run's file
  const t2 = performance.now();
  const g = await openFactory({ store });
  await g.ready;
  for (;;) { const st = (await g.backbone.status()).find((x) => x.name === "factory-log")!; if (st.lag === 0) break; await new Promise((r2) => setTimeout(r2, 50)); }
  const catchUpMs = performance.now() - t2;
  await g.close();
  out("liveProjectionCatchUp", { events: total, ms: Math.round(catchUpMs), filesWritten: readdirSync(join(store, "projections", "factory-log")).length, projectionBytes: dirSize(join(store, "projections")) });
  rmSync(dir, { recursive: true, force: true });
}
process.exit(0);
