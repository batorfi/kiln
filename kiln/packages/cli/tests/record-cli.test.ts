// `kiln record show|status|verify|rebuild-log` (r15 T046): the record read from outside, offline, through a fresh reader.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { openFactory } from "#durable/factory.ts";
import { logFile } from "#durable/record/consumers/factory-log.ts";
import { drive, PLAIN } from "../../durable/tests/walk/support.ts";

const MAIN = fileURLToPath(new URL("../src/main.ts", import.meta.url));
const kiln = (...args: string[]) => spawnSync(process.execPath, [MAIN, "record", ...args], { encoding: "utf8", env: { ...process.env, NODE_TEST_CONTEXT: undefined } });

/** A finished plain walk in a closed store. */
async function withWalkStore(run: (store: string) => void | Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k15-reccli-"));
  const store = join(dir, "s");
  try {
    const f = await openFactory({ store });
    await f.ready;
    await f.walks.admit("k1", "demo", PLAIN);
    await drive(f, "demo", (g) => ({ kind: "approve", decidedBy: "human@r15-script", ...(g.gateKey === "gate0" ? { admit: {} } : {}) }));
    for (let i = 0; i < 200 && !(await f.backbone.status()).every((s) => s.lag === 0); i++) await new Promise((r) => setTimeout(r, 20));
    await f.close();
    await run(store);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("show prints one complete envelope per line; --run narrows to a feature's events; --from/--to to a range", () => withWalkStore((store) => {
  const all = kiln("show", "--store", store);
  assert.equal(all.status, 0, all.stderr);
  const events = all.stdout.trim().split("\n").map((l) => JSON.parse(l));
  assert.ok(events.length > 60, `${events.length} events`);
  assert.deepEqual(events.map((e) => e.seq), events.map((_, i) => i + 1));
  for (const k of ["id", "seq", "type", "schema", "time", "subject", "actor", "correlation", "causation", "trace", "privacy", "data"]) assert.ok(k in events[0], k);
  assert.ok(!JSON.stringify(events).includes('"note"'), "no note text anywhere in the record");
  const run = kiln("show", "--store", store, "--run", "demo").stdout.trim().split("\n").map((l) => JSON.parse(l));
  assert.ok(run.length > 40, `${run.length} events in the run`);
  assert.ok(run.every((e) => e.correlation === "run:demo"));
  const range = kiln("show", "--store", store, "--from", "3", "--to", "5").stdout.trim().split("\n").map((l) => JSON.parse(l).seq);
  assert.deepEqual(range, [3, 4, 5]);
}));

test("status prints the head, the chunks and each consumer's cursor and lag", () => withWalkStore((store) => {
  const s = JSON.parse(kiln("status", "--store", store).stdout);
  assert.ok(s.head > 60 && s.legacyThrough === 0 && s.chunks >= 1, JSON.stringify(s));
  const c = s.consumers.find((x: { name: string }) => x.name === "factory-log");
  assert.deepEqual([c.seq, c.lag], [s.head, 0]);
}));

test("verify passes a whole record and says what it examined and how far it reached; --run verifies one feature", () => withWalkStore((store) => {
  const v = kiln("verify", "--store", store);
  assert.equal(v.status, 0, v.stdout);
  assert.match(v.stdout, /^PASS record — examined: \d+ events, reached seq \d+$/m);
  assert.match(kiln("verify", "--store", store, "--run", "demo").stdout, /^PASS record — examined: \d+ events of run demo, reached seq \d+$/m);
}));

test("verify of a record with no events FAILS and says it examined none (never vacuous)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "k15-reccli-"));
  try {
    const f = await openFactory({ store: join(dir, "s") }); // a factory that has recorded nothing
    await f.ready;
    await f.close();
    const v = kiln("verify", "--store", join(dir, "s"));
    assert.equal(v.status, 1);
    assert.match(v.stdout, /examined: 0 events/);
    assert.match(v.stdout, /record-vacuous/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("rebuild-log --out writes exactly the live factory-log file, byte for byte", () => withWalkStore((store) => {
  const out = join(store, "..", "rebuilt.jsonl");
  const r = kiln("rebuild-log", "--store", store, "--run", "demo", "--out", out);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(out, "utf8"), readFileSync(logFile(store, "demo"), "utf8"));
  assert.equal(kiln("rebuild-log", "--store", store, "--run", "demo").stdout, readFileSync(out, "utf8"));
}));

test("usage errors are exit 2 and name the problem; an unreadable store is exit 3", () => {
  assert.equal(kiln("explode").status, 2);
  assert.equal(kiln("show").status, 2);
  assert.match(kiln("show").stderr, /missing --store/);
  assert.equal(kiln("rebuild-log", "--store", "/nonexistent-r15").status, 2);
  assert.equal(kiln("show", "--store", "/nonexistent-r15", "--from", "x").status, 2);
});
