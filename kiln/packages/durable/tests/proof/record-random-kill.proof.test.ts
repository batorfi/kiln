// r15 T068 (PROOF tier): 300 random kills — a random scripted walk, a random point from EVERY family (the walk's, the record's mid-commit append, the backbone\'s, the archive\'s), a random hit — from a
// recorded seed, so a failure replays exactly. The factory is followed by the factory-log projection and two test consumers throughout. After each: the walk equals the uninterrupted one, a fresh owner
// lets everything catch up, and a fresh reader finds E1–E3, E4 (factory-log == rebuild), E5 (consumers), E6 (the archive: one verified file, one event, tombstones exactly when recorded) and E7.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ARCHIVE_KILL_POINTS, BACKBONE_KILL_POINTS, RECORD_KILL_POINTS, WALK_KILL_POINTS } from "#durable/hooks.ts";
import { inspectStore } from "#durable/inspect.ts";
import { catchUpAndJudge } from "./support/consumer-judge.ts";
import { runWalk, type Chooser } from "./support/walk-harness.ts";
import { baseline, FEATURE, INTERFACE, judge, PLAIN } from "./support/walk-judge.ts";

const SEED = 20261028;
const RUNS = Number(process.env.RECORD_RANDOM_RUNS ?? 300);
const HUMAN: Chooser = (g) => ({ kind: "approve", decidedBy: "human@r15-script", ...(g.gateKey === "gate0" ? { admit: {} } : {}) });
const owner = { env: { TEST_CONSUMERS: "1" } };
function rng(seed: number): () => number { // mulberry32: the same seed gives the same kills
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const POINTS = [...WALK_KILL_POINTS.filter((p) => !p.startsWith("walk.fix-round") && !p.startsWith("walk.withdraw")), ...RECORD_KILL_POINTS, ...BACKBONE_KILL_POINTS, ...ARCHIVE_KILL_POINTS];

/** How often each point is reached by an uninterrupted walk (the archive follows the end, so the baseline holds the owner a moment before it is stopped). */
const hitsCache = new Map<string, Promise<Map<string, number>>>();
function hitsOf(name: string, walk: typeof PLAIN): Promise<Map<string, number>> {
  let p = hitsCache.get(name);
  if (!p) {
    p = (async () => { const r = await runWalk({ feature: FEATURE, walk, choose: HUMAN, countHits: true, holdMs: 700, owner }); try { return r.hits; } finally { r.cleanup(); } })();
    hitsCache.set(name, p);
  }
  return p;
}

test(`${RUNS} random kills (seed ${SEED}) across the walk, the record, the backbone and the archive: every wreck is whole, every walk equals the uninterrupted one, every judgement holds`, { timeout: 7_200_000 }, async () => {
  const next = rng(SEED);
  const tally = new Map<string, number>();
  for (let k = 0; k < RUNS; k++) {
    const [name, walk] = next() < 0.5 ? (["interface", INTERFACE] as const) : (["plain", PLAIN] as const);
    const point = POINTS[Math.floor(next() * POINTS.length)];
    const hits = (await hitsOf(name, walk)).get(point) ?? 0;
    assert.ok(hits > 0, `${point} is never reached by the ${name} walk: the proof would be vacuous`);
    const nth = 1 + Math.floor(next() * hits);
    const base = await baseline(`${name}+human+consumers`, walk, HUMAN, owner);
    const run = await runWalk({ feature: FEATURE, walk, choose: HUMAN, killAt: point, killNth: nth, owner, holdMs: 700 }); // the owner lives a moment past the walk's end, so a point of the archive that follows it can fire
    try {
      assert.ok(run.fired.includes(point), `proof-point-not-fired: ${point} (hit ${nth}) in the ${name} walk, kill ${k}`);
      assert.deepEqual(await catchUpAndJudge(run.ts.store), [], `kill ${k}: ${name} walk at ${point} #${nth}`);
      await judge({ ...run, inspection: await inspectStore(run.ts.store) }, walk, base);
    } catch (e) {
      (e as Error).message = `[kill ${k}, ${name} walk, ${point} hit ${nth}, seed ${SEED}] ${(e as Error).message}`;
      throw e;
    } finally { run.cleanup(); }
    tally.set(point, (tally.get(point) ?? 0) + 1);
  }
  assert.equal([...tally.values()].reduce((a, b) => a + b, 0), RUNS);
  console.log(`random kills by point: ${JSON.stringify(Object.fromEntries(tally))}`);
});
