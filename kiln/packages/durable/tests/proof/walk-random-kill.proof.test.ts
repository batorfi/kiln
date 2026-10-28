// r14 T054 (US3, PROOF tier): 300 random kills — a random walk, a random walk point, a random hit — from a recorded seed, so a failure can be replayed exactly (r13 did the same for the gate).
import { test } from "node:test";
import assert from "node:assert/strict";
import { WALK_KILL_POINTS } from "#durable/hooks.ts";
import { baseline, INTERFACE, killRun, PLAIN } from "./support/walk-judge.ts";

const SEED = 20261027;
const RUNS = Number(process.env.WALK_RANDOM_RUNS ?? 300);
// a small deterministic generator (mulberry32): the same seed gives the same 300 kills
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test(`${RUNS} random kills (seed ${SEED}): every wreck is whole and every walk equals the uninterrupted one`, { timeout: 3_600_000 }, async () => {
  const next = rng(SEED);
  const points = WALK_KILL_POINTS.filter((p) => !p.startsWith("walk.fix-round") && !p.startsWith("walk.withdraw"));
  const tally = new Map<string, number>();
  for (let k = 0; k < RUNS; k++) {
    const [name, walk] = next() < 0.5 ? (["interface", INTERFACE] as const) : (["plain", PLAIN] as const);
    const point = points[Math.floor(next() * points.length)];
    const hits = (await baseline(name, walk)).hits.get(point) ?? 0;
    const nth = 1 + Math.floor(next() * hits);
    await killRun(name, walk, point, nth);
    tally.set(point, (tally.get(point) ?? 0) + 1);
  }
  assert.equal([...tally.values()].reduce((a, b) => a + b, 0), RUNS);
  console.log(`random kills by point: ${JSON.stringify(Object.fromEntries(tally))}`);
});
