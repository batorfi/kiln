// r15 T045 (US3): the factory-log is a projection of the record — one file per feature run, equal byte for byte to a rebuild from the first event, accepted by the first program's validators.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileOf, foldRun } from "#record/projections/factory-log.ts";
import { validateLog } from "#record/log.ts";
import { checkStream } from "#record/streams.ts";
import { openReader } from "#durable/library/open.ts";
import { collect, fromReader, readRun } from "#durable/record/read.ts";
import { logFile } from "#durable/record/consumers/factory-log.ts";
import { drive, INTERFACE, PLAIN, withFactory, type Chooser } from "../walk/support.ts";

const HUMAN: Chooser = (g) => ({ kind: "approve", decidedBy: "human@r15-script", ...(g.gateKey === "gate0" ? { admit: {} } : {}) });
const parse = (text: string) => text.split("\n").filter(Boolean).map((l) => JSON.parse(l));
async function until(cond: () => boolean | Promise<boolean>, what: string): Promise<void> {
  for (let i = 0; i < 300; i++) { if (await cond()) return; await new Promise((r) => setTimeout(r, 20)); }
  throw new Error(`timed out waiting for ${what}`);
}
const caughtUp = (f: { backbone: { status(): Promise<{ lag: number }[]> } }) => async () => (await f.backbone.status()).every((s) => s.lag === 0);

for (const [name, input] of [["plain", PLAIN], ["interface", INTERFACE]] as const) {
  test(`${name} walk: the live file equals a rebuild from the first event, byte for byte, and the first program's validator accepts it`, () => withFactory(async (f, store) => {
    await f.walks.admit("k1", "w", input);
    assert.equal((await drive(f, "w", HUMAN)).last.status, "done");
    await until(caughtUp(f), "the projection to catch up");
    const live = readFileSync(logFile(store, "w"), "utf8");
    const reader = await openReader(store);
    const events = await collect(readRun(fromReader(reader), "w"));
    await reader.close();
    assert.equal(live, fileOf(foldRun(events)), "live == rebuild");
    assert.ok(live.endsWith("\n") && live.split("\n").length > 20);
    const v = validateLog(parse(live));
    assert.deepEqual(v.failures, [], "the validators accept it (R1–R6, G3 under the flow each record names)");
    assert.equal(v.valid, true);
    assert.deepEqual(checkStream(events, { whole: false }).faults, [], "and the stream rules accept the events it was built from");
    assert.deepEqual(readdirSync(join(store, "projections", "factory-log")).filter((n) => n.includes(".tmp")), [], "no temporary file is left behind");
  }));
}

test("a walk decided by a SCRIPTED id is refused by the first program's validator: a program is not a human (r13's carried item, unchanged)", () => withFactory(async (f, store) => {
  await f.walks.admit("k1", "w", PLAIN);
  await drive(f, "w"); // DECIDER = script:r14
  await until(caughtUp(f), "the projection to catch up");
  const v = validateLog(parse(readFileSync(logFile(store, "w"), "utf8")));
  assert.equal(v.valid, false);
  assert.match(v.failures.join("\n"), /decidedBy|R3|human/);
}));

test("a run with no feature produces no file, and a feature with no line-producing event produces none either", () => withFactory(async (f, store) => {
  await f.tasks.create("u1", "kiln.unit", { label: "bare", steps: 1 } as never, { kind: "factory" });
  await until(async () => (await f.inspect()).outbox.some((e) => e.type === "unit.settled"), "the unit to settle");
  await until(caughtUp(f), "the projection to catch up");
  assert.equal(existsSync(join(store, "projections", "factory-log")) ? readdirSync(join(store, "projections", "factory-log")).length : 0, 0);
}));

test("killing nothing, restarting: the file is rewritten whole and identically (a repeat changes nothing)", () => withFactory(async (f, store) => {
  await f.walks.admit("k1", "w", PLAIN);
  await drive(f, "w", HUMAN);
  await until(caughtUp(f), "the projection to catch up");
  const before = readFileSync(logFile(store, "w"), "utf8");
  await f.backbone.stop();
  const { openFactory } = await import("#durable/factory.ts");
  await f.close();
  const g = await openFactory({ store });
  try {
    await g.ready;
    await until(caughtUp(g), "the restarted projection");
    assert.equal(readFileSync(logFile(store, "w"), "utf8"), before);
  } finally { await g.close(); }
}));
