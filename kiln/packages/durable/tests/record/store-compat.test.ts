// r15 T055 (US5, SC-005): a store r14's owner wrote (fixtures/stores/, made with r14's UNCHANGED code before any r15 change) opens with the new owner. Every stored entry reads as a current-version
// event, nothing stored is rewritten, the waiting gate still takes a move, the walk goes on, and the new events continue the numbering after the old ones.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateEvent } from "#record/events/validate.ts";
import { validateLog } from "#record/log.ts";
import { checkStream } from "#record/streams.ts";
import { openFactory } from "#durable/factory.ts";
import { openReader } from "#durable/library/open.ts";
import { logFile } from "#durable/record/consumers/factory-log.ts";
import { collect, fromReader, headOf, readRecord, readRun } from "#durable/record/read.ts";
import { verifyRecord } from "#durable/record/tools.ts";
import { checkRecordInvariants } from "../proof/support/record-oracle.ts";
import { drive } from "../walk/support.ts";

const FIXTURES = fileURLToPath(new URL("../../../../fixtures/stores/", import.meta.url));

/** A copy of a committed r14 store in a temporary directory (nothing opens the fixture in place). */
async function withR14Store(name: string, run: (store: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k15-compat-"));
  try {
    cpSync(join(FIXTURES, name), join(dir, "s"), { recursive: true });
    await run(join(dir, "s"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const outboxOf = async (store: string): Promise<string> => {
  const r = await openReader(store);
  try { return JSON.stringify(await r.snapshot("kiln.outbox", "main")); } finally { await r.close(); }
};
const caughtUp = async (f: { backbone: { status(): Promise<{ lag: number }[]> } }) => { for (let i = 0; i < 300 && !(await f.backbone.status()).every((s) => s.lag === 0); i++) await new Promise((r) => setTimeout(r, 20)); };

test("the finished interface store: 38 version 0 entries read as current-version events, valid, and nothing stored changes", () => withR14Store("r14-interface-done", async (store) => {
  const before = await outboxOf(store);
  const f = await openFactory({ store });
  try {
    await f.ready;
    await caughtUp(f);
    assert.equal((await f.walks.state("iface")).status, "done");
  } finally { await f.close(); }
  const r = await openReader(store);
  const events = await collect(readRecord(fromReader(r)));
  assert.deepEqual(await headOf(fromReader(r)), { next: 39, legacyThrough: 38 });
  await r.close();
  assert.equal(events.length, 38);
  for (const e of events) assert.deepEqual(validateEvent(e), [], `${e.type} #${e.seq}`);
  assert.deepEqual(events.map((e) => e.seq), Array.from({ length: 38 }, (_, i) => i + 1));
  assert.equal(await outboxOf(store), before, "kiln.outbox/main is byte-identical after the new owner has opened, followed and closed it");
  assert.deepEqual((await verifyRecord(store)).faults.filter((x) => !x.startsWith("stream-silent-approval")), [], "the only stream faults are the scripted deciders (a program is not a human)");
  assert.deepEqual(await checkRecordInvariants(store), []);
}));

test("its factory-log is rebuilt from the version 0 entries; the first program's validator refuses it, naming the scripted decider (r14's deciders are script:r14)", () => withR14Store("r14-interface-done", async (store) => {
  const f = await openFactory({ store });
  try {
    await f.ready;
    await caughtUp(f);
  } finally { await f.close(); }
  assert.ok(existsSync(logFile(store, "iface")), "the projection built a file for the run from entries it did not write");
  const lines = readFileSync(logFile(store, "iface"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.equal(lines.filter((l) => l.recordType === "gate-completion").length, 12);
  const v = validateLog(lines);
  assert.equal(v.valid, false);
  assert.match(v.failures.join("\n"), /decidedBy|R3|human/);
}));

test("the waiting store: its gate still takes a person's move, the walk goes on, and the first new event follows the last old one", () => withR14Store("r14-plain-waiting", async (store) => {
  const before = await outboxOf(store);
  const f = await openFactory({ store });
  try {
    await f.ready;
    const v = await f.walks.next("plain");
    assert.equal(v.openGate?.gateKey, "3-spec", "the gate r14 left waiting is shown once its decision step has re-registered");
    assert.equal(v.history.filter((h) => h.type === "gate.not-applicable").length, 2, "the history of the run is read across the old entries");
    const d = await drive(f, "plain");
    assert.equal(d.last.status, "done", "the walk went on to Merge");
    assert.ok(d.steps.every((s) => s.outcome.status === "committed"));
    await caughtUp(f);
  } finally { await f.close(); }
  assert.equal(await outboxOf(store), before, "the old document is not touched by the walk that continued it");
  const r = await openReader(store);
  try {
    const all = await collect(readRecord(fromReader(r)));
    const legacyThrough = (await headOf(fromReader(r))).legacyThrough;
    assert.equal(legacyThrough, 13);
    assert.equal(all[13].seq, 14, "the first event written by the new owner has the next number");
    assert.deepEqual(all.map((e) => e.seq), all.map((_, i) => i + 1), "one gap-free order across the boundary");
    const run = await collect(readRun(fromReader(r), "plain"));
    assert.ok(run.length > all.length * 0.8 && run.every((e) => e.correlation === "run:plain"));
    assert.deepEqual(checkStream(run, { whole: false }).faults.filter((f) => f.code !== "stream-silent-approval"), []);
  } finally { await r.close(); }
  assert.deepEqual(await checkRecordInvariants(store), []);
}));
