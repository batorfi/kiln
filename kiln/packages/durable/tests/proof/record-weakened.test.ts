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
