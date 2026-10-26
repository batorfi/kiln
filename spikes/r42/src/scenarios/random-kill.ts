// T035 — randomised external kills: SUPPORTING evidence for guarantees a and e. A named kill point cannot reach INSIDE the store's own commit statement;
// a SIGKILL from the parent at a random instant can. It can show a violation (that counts), but a few hundred clean trials prove nothing about absence, so
// these results are marked `supporting` and never, on their own, make a guarantee `held` (status.ts). The delays come from a SEEDED generator, so a failing
// trial can be replayed; the seed is printed in the result.
import { performance } from "node:perf_hooks";
import { checkInvariants, checkStability, type Invariant } from "../invariants.ts";
import type { ScenarioResult } from "../evidence-model.ts";
import { connect } from "../client.ts";
import { killNow, makeStore, startOwner } from "../harness.ts";
import type { Strategy } from "../strategy.ts";
import { GATE, KEY, MOVE } from "./common.ts";

/** mulberry32 — a small, well-known seeded generator. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `n` delays in [0, 8] ms — the window in which a move is in flight between the parent's send and the owner's acknowledgement. */
export function randomDelays(seed: number, n: number): number[] {
  const rand = mulberry32(seed);
  return Array.from({ length: n }, () => rand() * 8);
}

const spin = (ms: number): void => {
  const until = performance.now() + ms;
  while (performance.now() < until) {
    /* sub-millisecond precision: setTimeout cannot do it */
  }
};

interface Trial {
  settled: boolean;
  unknownOutcome: boolean;
  atomic: Invariant[];
  stability: Invariant[];
}

async function trial(strategy: Strategy, delayMs: number): Promise<Trial> {
  const s = makeStore();
  try {
    const owner = await startOwner({ strategy: strategy.name, store: s });
    const c = await connect(s.socket, { timeoutMs: 3000 });
    await c.open(GATE);
    const pending = c.submit(GATE, KEY, MOVE); // not awaited: the kill lands while it is in flight
    spin(delayMs);
    await killNow(owner);
    const outcome = await pending;
    c.close();
    const i1 = await strategy.inspect(s.store, GATE);
    const owner2 = await startOwner({ strategy: strategy.name, store: s });
    const i2 = await strategy.inspect(s.store, GATE);
    await killNow(owner2);
    return {
      settled: i1.gate === "settled",
      unknownOutcome: outcome.status === "refused" && outcome.reason === "store-error",
      atomic: [...new Set([...checkInvariants(i1), ...checkInvariants(i2)])],
      stability: checkStability(i1, i2),
    };
  } finally {
    s.cleanup();
  }
}

export async function runRandomKillScenarios(strategy: Strategy, opts: { trials?: number; seed?: number; concurrency?: number } = {}): Promise<ScenarioResult[]> {
  const trials = opts.trials ?? 300;
  const seed = opts.seed ?? 1;
  const concurrency = opts.concurrency ?? 8;
  const delays = randomDelays(seed, trials);
  const results: Trial[] = [];
  for (let i = 0; i < trials; i += concurrency) results.push(...(await Promise.all(delays.slice(i, i + concurrency).map((d) => trial(strategy, d)))));

  const settled = results.filter((t) => t.settled).length;
  const counts = {
    trials,
    settled,
    waiting: trials - settled,
    unknownOutcome: results.filter((t) => t.unknownOutcome).length,
    violations: results.filter((t) => t.atomic.length > 0 || t.stability.length > 0).length,
  };
  const detail = `${trials} random kills, seed ${seed}, delays 0–8 ms after the move was sent; ${counts.settled} ended settled, ${counts.waiting} waiting, ${counts.unknownOutcome} had no answer from the owner`;
  const base = { kind: "random-kill" as const, strategy: strategy.name, scenario: `random-kill:${trials}`, supporting: true, ran: true, counts, detail };
  const a = [...new Set(results.flatMap((t) => t.atomic))].sort() as Invariant[];
  const e = [...new Set(results.flatMap((t) => t.stability))].sort() as Invariant[];
  return [
    { ...base, guarantee: "a", passed: a.length === 0, violated: a },
    { ...base, guarantee: "e", passed: e.length === 0, violated: e },
  ];
}
