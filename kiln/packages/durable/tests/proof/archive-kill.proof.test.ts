// r15 T063 (US7, PROOF tier): the owner is SIGKILLed at each archive step (the file written, verified, mid-commit with its tombstones, committed) and at the walk's last commits. After the restart a
// fresh owner finishes whatever was left, and a fresh reader finds (E6): one archive file that verifies, one feature.archived event, tombstones exactly when the event is — never compacted before
// recorded, never recorded without the file — plus the record's own invariants and the walk equal to the uninterrupted one. A kill at the walk\'s end must still leave the walk archived (the archive task is
// created in the SAME commit as the end, so there is no window in which an ended walk has none).
import { test } from "node:test";
import assert from "node:assert/strict";
import { openFactory } from "#durable/factory.ts";
import { ARCHIVE_KILL_POINTS } from "#durable/hooks.ts";
import { inspectStore } from "#durable/inspect.ts";
import { runWalk } from "./support/walk-harness.ts";
import { baseline, FEATURE, judge, PLAIN } from "./support/walk-judge.ts";
import { checkArchiveInvariants, checkRecordInvariants } from "./support/record-oracle.ts";
import type { Chooser } from "./support/walk-harness.ts";

const HUMAN: Chooser = (g) => ({ kind: "approve", decidedBy: "human@r15-script", ...(g.gateKey === "gate0" ? { admit: {} } : {}) });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function finishArchive(store: string): Promise<void> {
  const f = await openFactory({ store });
  try {
    await f.ready;
    for (let i = 0; i < 400; i++) {
      const tasks = await f.tasks.list();
      const done = (await checkArchiveInvariants(store, { requireArchived: true })).length === 0;
      if (done && tasks.every((t) => t.status === "terminal")) return;
      await sleep(25);
    }
    throw new Error("the archive did not finish after the restart");
  } finally { await f.close(); }
}

async function killAt(point: string, nth: number): Promise<void> {
  const base = await baseline("plain+human", PLAIN, HUMAN);
  const run = await runWalk({ feature: FEATURE, walk: PLAIN, choose: HUMAN, killAt: point, killNth: nth });
  try {
    assert.ok(run.fired.includes(point), `proof-point-not-fired: ${point} (hit ${nth})`);
    // E6 must hold at EVERY moment, including the wreck the kill left (nothing compacted before it was recorded, nothing recorded without its file)
    assert.deepEqual(await checkArchiveInvariants(run.ts.store), [], `${point}: the wreck`);
    await finishArchive(run.ts.store);
    assert.deepEqual(await checkArchiveInvariants(run.ts.store, { requireArchived: true }), [], `${point}: after the restart finished it`);
    assert.deepEqual(await checkRecordInvariants(run.ts.store), []);
    await judge({ ...run, inspection: await inspectStore(run.ts.store) }, PLAIN, base);
  } finally { run.cleanup(); }
}

test("the archive\'s four points are declared, and a walk reaches each of them (the proof cannot be vacuous)", async () => {
  assert.equal(ARCHIVE_KILL_POINTS.length, 4);
  const run = await runWalk({ feature: FEATURE, walk: PLAIN, choose: HUMAN, countHits: true, holdMs: 600 });
  try {
    for (const p of ARCHIVE_KILL_POINTS) assert.ok((run.hits.get(p) ?? 0) >= 1, `${p} was never reached`);
  } finally { run.cleanup(); }
});

for (const point of ARCHIVE_KILL_POINTS) test(`killed at ${point}: exactly one verified archive and one event after the restart, never compacted before recorded`, { timeout: 180_000 }, () => killAt(point, 1));
for (const point of ["walk.consume-after-write", "walk.consume-committed"]) test(`killed at the walk\'s end (${point}, last hit): the ended walk still gets its archive`, { timeout: 180_000 }, async () => {
  const base = await baseline("plain+human", PLAIN, HUMAN);
  await killAt(point, base.hits.get(point) ?? 1);
});
