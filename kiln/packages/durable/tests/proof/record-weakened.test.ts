// r15 T036 (DEFAULT tier): the proof is shown able to FAIL. A writer that skips validation, and one that takes its sequence number from memory, are each caught BY NAME by the oracle — and the real
// writer refuses (or numbers correctly) the very same input.
import { test } from "node:test";
import assert from "node:assert/strict";
import { appendEvent, EventRejected } from "#durable/record/append.ts";
import { withStore } from "../record/support.ts";
import { draft } from "../record/support.ts";
import { appendWithoutValidation, seqFromMemory } from "./support/broken-record.ts";
import { runWalk } from "./support/walk-harness.ts";
import { FEATURE, PLAIN } from "./support/walk-judge.ts";
import { catchUpAndJudge } from "./support/consumer-judge.ts";
import { checkRecordInvariants } from "./support/record-oracle.ts";

test("a writer that skips validation stores a note; E2 names it; the real writer refuses the same event", () => withStore(async (s, dir) => {
  const bad = draft({ data: { approved: [], note: "please redo this" } });
  await assert.rejects(s.commit((tx) => appendEvent(tx, bad)), (e: unknown) => e instanceof EventRejected && e.code === "event-field-forbidden");
  await s.commit((tx) => appendWithoutValidation(tx, bad));
  await s.close();
  const v = await checkRecordInvariants(dir);
  assert.ok(v.some((x) => x.startsWith("E2") && x.includes("event-field-forbidden")), JSON.stringify(v));
}));

test("a writer that numbers from memory leaves a hole after a rolled-back commit; E1 names it; the real writer does not", () => withStore(async (s, dir) => {
  const w = seqFromMemory();
  const first = w.next();
  await s.commit((tx) => w.append(tx, draft(), first)); // seq 1, fine
  const lost = w.next();
  await assert.rejects(s.commit(async (tx) => { await w.append(tx, draft(), lost); throw new Error("the commit fails after the number was taken"); }));
  const third = w.next(); // 3: the number 2 was consumed by the commit that rolled back
  await s.commit((tx) => w.append(tx, draft(), third));
  await s.close();
  const v = await checkRecordInvariants(dir);
  assert.ok(v.some((x) => x.startsWith("E1")), JSON.stringify(v));
}));

test("the real writer, given the same failing commit, leaves no hole", () => withStore(async (s, dir) => {
  await s.commit((tx) => appendEvent(tx, draft()));
  await assert.rejects(s.commit(async (tx) => { await appendEvent(tx, draft()); throw new Error("the commit fails after the append"); }));
  await s.commit((tx) => appendEvent(tx, draft()));
  await s.close();
  assert.deepEqual(await checkRecordInvariants(dir), []);
}));

test("a consumer that acknowledges before its effect is done loses an effect to a kill; E5 names it — the real consumer, killed the same way, loses nothing", { timeout: 120_000 }, async () => {
  const broken = await runWalk({ feature: FEATURE, walk: PLAIN, killAt: "backbone.batch-read", killNth: 3, owner: { env: { TEST_CONSUMERS: "1", BROKEN_CONSUMER: "1" } } });
  try {
    assert.ok(broken.fired.includes("backbone.batch-read"));
    const v = await catchUpAndJudge(broken.ts.store, true);
    assert.ok(v.some((x) => x.startsWith("E5") && /never delivered/.test(x)), `the weakened consumer must be caught by E5; the oracle said ${JSON.stringify(v)}`);
  } finally { broken.cleanup(); }
  const real = await runWalk({ feature: FEATURE, walk: PLAIN, killAt: "backbone.batch-read", killNth: 3, owner: { env: { TEST_CONSUMERS: "1" } } });
  try {
    assert.deepEqual(await catchUpAndJudge(real.ts.store), []);
  } finally { real.cleanup(); }
});

// ── T048: weakened projections ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openFactory } from "#durable/factory.ts";
import { logFile } from "#durable/record/consumers/factory-log.ts";
import { collect, fromReader, readRun } from "#durable/record/read.ts";
import { openReader } from "#durable/library/open.ts";
import { foldRun } from "#record/projections/factory-log.ts";
import { drive, PLAIN as PLAIN_WALK } from "../walk/support.ts";
import { checkProjectionInvariants } from "./support/record-oracle.ts";

/** Two finished walks in one store (so "the order of unrelated runs" can matter), the projection caught up and the factory closed. */
async function twoWalks(): Promise<{ store: string; cleanup: () => void }> {
  const dir = mkdtempSync(join(tmpdir(), "k15-weakproj-"));
  const store = join(dir, "s");
  const f = await openFactory({ store });
  await f.ready;
  await f.walks.admit("ka", "a", PLAIN_WALK);
  await f.walks.admit("kb", "b", PLAIN_WALK);
  const human = (g: { gateKey: string }) => ({ kind: "approve" as const, decidedBy: "human@r15-script", ...(g.gateKey === "gate0" ? { admit: {} } : {}) });
  await Promise.all([drive(f, "a", human as never), drive(f, "b", human as never)]);
  for (let i = 0; i < 300 && !(await f.backbone.status()).every((s) => s.lag === 0); i++) await new Promise((r) => setTimeout(r, 20));
  await f.close();
  return { store, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
async function eventsOf(store: string, run: string) {
  const r = await openReader(store);
  try { return await collect(readRun(fromReader(r), run)); } finally { await r.close(); }
}

test("the real projection of two interleaved walks equals each run's rebuild (E4 clean) — the control for the weakened ones", async () => {
  const w = await twoWalks();
  try { assert.deepEqual(await checkProjectionInvariants(w.store), []); } finally { w.cleanup(); }
});

test("a projection that reads the clock is caught by E4: its file is not what the record rebuilds", async () => {
  const w = await twoWalks();
  try {
    const lines = foldRun(await eventsOf(w.store, "a")).map((l) => ({ ...JSON.parse(l), ts: new Date().toISOString() })); // the weakness: time from the clock, not the event
    writeFileSync(logFile(w.store, "a"), lines.map((l) => `${JSON.stringify(l)}\n`).join(""));
    const v = await checkProjectionInvariants(w.store);
    assert.ok(v.some((x) => x.startsWith("E4") && x.includes("run a")), JSON.stringify(v));
    assert.ok(!v.some((x) => x.includes("run b")), "and only the run it damaged");
  } finally { w.cleanup(); }
});

test("a projection that numbers its lines across runs (its output depends on the order of unrelated runs) is caught by E4", async () => {
  const w = await twoWalks();
  try {
    const a = foldRun(await eventsOf(w.store, "a"));
    const lines = foldRun(await eventsOf(w.store, "b")).map((l, i) => ({ ...JSON.parse(l), seq: a.length + i })); // the weakness: a shared counter
    writeFileSync(logFile(w.store, "b"), lines.map((l) => `${JSON.stringify(l)}\n`).join(""));
    const v = await checkProjectionInvariants(w.store);
    assert.ok(v.some((x) => x.startsWith("E4") && x.includes("run b")), JSON.stringify(v));
  } finally { w.cleanup(); }
});

test("a missing file for a run that has lines is caught too (E4)", async () => {
  const w = await twoWalks();
  try {
    rmSync(logFile(w.store, "a"));
    assert.ok((await checkProjectionInvariants(w.store)).some((x) => x.includes("(no file)")));
  } finally { w.cleanup(); }
});
