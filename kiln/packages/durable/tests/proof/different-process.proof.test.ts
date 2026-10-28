// r13 T059 — the same proofs with the completer a SEPARATE PROCESS (spec US2/US3/US7, FR-017, SC-003): `kiln gate …` reaching the owner through its private channel, never the store. Two groups, run
// with the same oracle and the same counts as T036 (exactly once) and T038 (every kill point):
//   · exactly once: 100 identical moves, 100 competing moves, 100 more after a SIGKILL and a restart; every refusal; a move during start-up; an injected store failure;
//   · every declared GATE kill point: the owner (serving the channel) dies by SIGKILL at the point while a command-line process is mid-request; the wreck is read by a fresh reader; a restarted owner
//     agrees; the same keys, again from command-line processes, finish the job exactly once.
// They are reported under their own names (prefix "separate process:"), so a point is not counted twice; the last test fails by name if a variant of any case did not run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { briefRef } from "#durable/canonical.ts";
import { GATE_KILL_POINTS } from "#durable/hooks.ts";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants, checkStability } from "./support/oracle.ts";
import { assertAllFired } from "./support/guard.ts";
import { killNow, makeStore, spawnOwner, startOwner, type OwnerOptions, type TestStore } from "./support/harness.ts";
import { json, kiln, type Ran } from "../../../cli/tests/support/kiln.ts";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const GATE = "gate:demo:gate0:1";
const BRIEF_FILE = fileURLToPath(new URL("../../../../fixtures/demo-brief.json", import.meta.url));
const REF = briefRef(JSON.parse(readFileSync(BRIEF_FILE, "utf8")));
const REPEATS = 100;
const RACERS = 100;
const CONCURRENCY = 25; // command-line processes in flight at once (each is a whole Node process)
const ran: string[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const env = (ts: TestStore) => ({ TMPDIR: ts.dir });
const open = (ts: TestStore, key = "o1"): Promise<Ran> => kiln(["gate", "open", "--store", ts.store, "--key", key, "--gate", GATE, "--gate-key", "gate0", "--flow", "v2", "--brief", BRIEF_FILE, "--by", "factory"], env(ts));
const move = (ts: TestStore, key: string, kind = "approve", by = "person@example", ref = REF, gate = GATE): Promise<Ran> =>
  kiln(["gate", "move", "--store", ts.store, "--gate", gate, "--key", key, "--kind", kind, "--by", by, "--brief-ref", ref], env(ts));
const state = (ts: TestStore): Promise<Ran> => kiln(["gate", "state", "--store", ts.store, "--gate", GATE], env(ts));
const tally = (rs: any[]) => ({ committed: rs.filter((r) => r.status === "committed"), repeat: rs.filter((r) => r.status === "repeat"), refused: rs.filter((r) => r.status === "refused") });
async function pool<T>(n: number, concurrency: number, f: (i: number) => Promise<T>): Promise<T[]> {
  const out: T[] = new Array(n);
  let next = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => { for (;;) { const i = next++; if (i >= n) return; out[i] = await f(i); } }));
  return out;
}
async function withStore(name: string, run: (ts: TestStore) => Promise<void>): Promise<void> {
  const ts = makeStore();
  try {
    await run(ts);
    ran.push(name);
  } finally {
    ts.cleanup();
  }
}
const serve = (ts: TestStore, o: OwnerOptions = {}) => startOwner(ts, { serve: true, ...o, env: { ...env(ts), ...(o.env ?? {}) } });

const EXACTLY_ONCE = [
  "identical moves, then more after a restart",
  "competing moves",
  "refusals",
  "a move during start-up",
  "an injected store failure",
] as const;

test(`separate process: ${REPEATS} identical moves → 1 committed, ${REPEATS - 1} repeat, 1 record; ${REPEATS} more after a SIGKILL and a restart → 0 committed`, () => withStore(EXACTLY_ONCE[0], async (ts) => {
  const o1 = await serve(ts);
  assert.equal(json(await open(ts)).status, "opened");
  const first = await pool(REPEATS, CONCURRENCY, () => move(ts, "k1"));
  assert.ok(first.every((r) => r.code === 0), first.find((r) => r.code !== 0)?.stderr);
  const t = tally(first.map(json));
  assert.deepEqual([t.committed.length, t.repeat.length, t.refused.length], [1, REPEATS - 1, 0]);
  assert.ok(t.repeat.every((r: any) => JSON.stringify(r.record) === JSON.stringify(t.committed[0].record)), "every repeat names the committed record");
  await killNow(o1);
  const i1 = await inspectStore(ts.store, GATE);
  assert.equal(i1.records.length, 1);
  assert.deepEqual(checkInvariants(i1), []);

  const o2 = await serve(ts);
  const second = tally((await pool(REPEATS, CONCURRENCY, () => move(ts, "k1"))).map(json));
  assert.deepEqual([second.committed.length, second.repeat.length, second.refused.length], [0, REPEATS, 0]);
  await killNow(o2);
  const i2 = await inspectStore(ts.store, GATE);
  assert.deepEqual(i2.records, i1.records, "the record is exactly as it was");
  assert.deepEqual(checkInvariants(i2), []);
}));

test(`separate process: ${RACERS} different keys at once → 1 committed, ${RACERS - 1} refused naming the winner, 1 record`, () => withStore(EXACTLY_ONCE[1], async (ts) => {
  const o = await serve(ts);
  await open(ts);
  const kinds = ["approve", "revise", "reject"];
  const rs = await pool(RACERS, CONCURRENCY, (n) => move(ts, `race-${n}`, kinds[n % 3], `person-${n}@example`));
  assert.ok(rs.every((r) => r.code === 0), rs.find((r) => r.code !== 0)?.stderr);
  const t = tally(rs.map(json));
  assert.deepEqual([t.committed.length, t.repeat.length, t.refused.length], [1, 0, RACERS - 1]);
  const winner = t.committed[0].record.key;
  assert.ok(t.refused.every((r: any) => ["lost-race", "stale"].includes(r.reason) && r.winner === winner), "each loser names the winner");
  await killNow(o);
  const i = await inspectStore(ts.store, GATE);
  assert.deepEqual([i.records.length, i.records[0].key], [1, winner]);
  assert.deepEqual(checkInvariants(i), []);
}));

test("separate process: conflict, stale, invalid (all four kinds) and unknown gate — each refused by name; the one record never changes", () => withStore(EXACTLY_ONCE[2], async (ts) => {
  const o = await serve(ts);
  await open(ts);
  const seq = [
    await move(ts, "m1"),
    await move(ts, "m1", "reject"),
    await move(ts, "m2", "revise"),
    await move(ts, "m3", "approve", " "),
    await move(ts, "m4", "restart"),
    await move(ts, "m5", "approve", "person@example", ""),
    await move(ts, "m6", "approve", "person@example", briefRef({ other: 1 })),
    await move(ts, "m7", "approve", "person@example", REF, "gate:nope:gate0:1"),
  ];
  assert.ok(seq.every((x) => x.code === 0), "a refusal is an answer: exit 0");
  const [c, conflict, stale, ...rest] = seq.map(json);
  assert.equal(c.status, "committed");
  assert.deepEqual([conflict.reason, conflict.original], ["key-conflict", "m1"]);
  assert.deepEqual([stale.reason, stale.winner], ["stale", "m1"]);
  for (const x of rest.slice(0, 4)) assert.equal(x.reason, "invalid-move", JSON.stringify(x));
  assert.equal(rest[4].reason, "unknown-gate");
  await killNow(o);
  const i = await inspectStore(ts.store, GATE);
  assert.deepEqual([i.records.length, i.records[0].key, i.records[0].move.kind], [1, "m1", "approve"]);
  assert.equal((await inspectStore(ts.store, "gate:nope:gate0:1")).documents.gate, false);
  assert.deepEqual(checkInvariants(i), []);
}));

test("separate process: a move during start-up is not-ready (transient), and the same key succeeds once ready", () => withStore(EXACTLY_ONCE[3], async (ts) => {
  const life1 = await serve(ts);
  await open(ts);
  await killNow(life1);
  const life2 = await serve(ts, { holdAt: "wait.before-register", holdMs: 1500 });
  const early = await move(ts, "m1");
  assert.equal(early.code, 0, early.stderr);
  assert.deepEqual([json(early).status, json(early).reason], ["refused", "not-ready"]);
  const deadline = Date.now() + 15_000;
  let again = await move(ts, "m1");
  while (json(again).reason === "not-ready" && Date.now() < deadline) { await sleep(200); again = await move(ts, "m1"); }
  assert.equal(json(again).status, "committed", JSON.stringify(json(again)));
  await killNow(life2);
  const i = await inspectStore(ts.store, GATE);
  assert.equal(i.records.length, 1);
  assert.deepEqual(checkInvariants(i), []);
}));

test("separate process: an injected store failure → store-error, the gate still waiting, no record; then the same key commits without the fault", () => withStore(EXACTLY_ONCE[4], async (ts) => {
  const life1 = await serve(ts);
  await open(ts);
  await killNow(life1);
  const faulty = await serve(ts, { faultAt: "store-write" });
  const r = await move(ts, "m1");
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual([json(r).status, json(r).reason], ["refused", "store-error"]);
  assert.deepEqual(json(await state(ts)), { state: "waiting" });
  await killNow(faulty);
  const wreck = await inspectStore(ts.store, GATE);
  assert.equal(wreck.records.length, 0);
  assert.deepEqual(checkInvariants(wreck), []);
  const healthy = await serve(ts);
  assert.equal(json(await move(ts, "m1")).status, "committed");
  await killNow(healthy);
  const done = await inspectStore(ts.store, GATE);
  assert.equal(done.records.length, 1);
  assert.deepEqual(checkInvariants(done), []);
}));

// ── every declared gate kill point, with the completer in another process ───────────────────────────────────────────────
const GATE_POINTS = GATE_KILL_POINTS;
const fired: string[] = [];

for (const point of GATE_POINTS) {
  test(`separate process: killed at ${point} with a command-line process mid-request — nothing half-applied, the restart agrees, the same keys finish it once`, () => withStore(`kill:${point}`, async (ts) => {
    if (point === "recover.start") {
      const prior = await serve(ts);
      await open(ts);
      await killNow(prior);
      const dying = spawnOwner(ts, { serve: true, killAt: point, env: env(ts), script: [{ op: "hold" }] });
      const { signal } = await dying.exited;
      assert.equal(signal, "SIGKILL", `the owner must die by SIGKILL during recovery\n${dying.stdout()}${dying.stderr()}`);
    } else {
      const dying = spawnOwner(ts, { serve: true, killAt: point, env: env(ts), script: [{ op: "hold" }] });
      await dying.listening;
      await open(ts); // may be the request that kills it
      await move(ts, "m1"); // so may this one (exit 4 = outcome unknown; exit 3 = already gone)
      const raced = await Promise.race([dying.exited.then(() => true), sleep(4000).then(() => false)]);
      if (!raced) await killNow(dying);
      assert.ok(raced, `the owner never reached ${point} (it was still alive after open, move and 4 s)\n${dying.stdout()}${dying.stderr()}`);
      assert.equal((await dying.exited).signal, "SIGKILL");
    }
    assert.deepEqual(ts.killed(), [point], `the kill point ${point} must have FIRED (and only it)`);
    fired.push(point);

    const wreck = await inspectStore(ts.store, GATE);
    assert.deepEqual(checkInvariants(wreck), [], `the wreckage at ${point}`);
    const wasSettled = wreck.records.length === 1;

    const quiet = await serve(ts);
    const opened = json(await open(ts));
    assert.ok(["opened", "repeat"].includes(opened.status), JSON.stringify(opened));
    const st = json(await state(ts));
    if (wasSettled) assert.equal(st.state, "settled", "the restarted owner reports what the store holds");
    await sleep(1500);
    await killNow(quiet);
    const quietReading = await inspectStore(ts.store, GATE);
    assert.deepEqual(checkInvariants(quietReading), []);
    assert.deepEqual(checkStability(wreck, quietReading), [], `the restart changed what it must not (${point})`);

    const again = await serve(ts);
    const moved = json(await move(ts, "m1"));
    assert.equal(moved.status, wasSettled ? "repeat" : "committed", `the same move key after ${point} (the wreck ${wasSettled ? "had" : "had no"} record)`);
    await sleep(1500);
    await killNow(again);
    const after = await inspectStore(ts.store, GATE);
    assert.deepEqual(checkInvariants(after), []);
    assert.equal(after.records.length, 1);
    assert.equal(after.records[0].key, "m1");
    assert.equal(after.outbox.filter((e) => e.type === "gate.opened").length, 1, "exactly one gate.opened");
    assert.equal(after.outbox.filter((e) => e.type === "move.committed").length, 1, "exactly one move.committed");
    assert.equal(after.outbox.filter((e) => e.type === "gate.settled").length, 1, "exactly one gate.settled");
    assert.equal(after.gateTask, "terminal");
    assert.deepEqual(after.timers, []);
  }));
}

test("NEVER VACUOUS: the separate-process variant of every exactly-once case and of every declared gate kill point ran", () => {
  const missing = [...EXACTLY_ONCE, ...GATE_POINTS.map((p) => `kill:${p}`)].filter((n) => !ran.includes(n));
  assert.deepEqual(missing, [], `separate-process variants that did not run: ${missing.join(", ")}`);
  const { exercised, of } = assertAllFired(GATE_POINTS, fired);
  console.log(`separate process — exactly-once cases: ${EXACTLY_ONCE.length} of ${EXACTLY_ONCE.length}; kill points exercised: ${exercised} of ${of}`);
});
