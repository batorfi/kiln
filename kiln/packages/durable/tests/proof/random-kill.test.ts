// r13 T039 — randomised external kills: SUPPORTING evidence for a gate that survives a SIGKILL at an instant no name can reach (inside the database's own statements). 300 seeded trials: a child
// owner starts to open a gate and move it; the parent SIGKILLs it a seeded random number of milliseconds after it STARTED; a fresh reader judges the wreck; a restarted owner drives the same keys.
// It can show a violation (that counts); 300 clean trials prove nothing about absence, so the named points of kill-points.test.ts carry the proof. The seed is printed so a failing trial replays.
import { test } from "node:test";
import assert from "node:assert/strict";
import { briefRef } from "#durable/canonical.ts";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants } from "./support/oracle.ts";
import { killNow, makeStore, runThenKill, spawnOwner } from "./support/harness.ts";

export const TRIALS = 300;
export const SEED = 20261026;
const MAX_DELAY_MS = 60;
const GATE = "gate:demo:gate0:1";
const BRIEF = { title: "Roadmap" };
const OPEN = { op: "open", key: "o1", spec: { gateId: GATE, gateKey: "gate0", flow: "v2", brief: BRIEF, openedBy: "factory" } };
const MOVE = { op: "submit", gate: GATE, key: "m1", move: { kind: "approve", decidedBy: "person@example", briefRef: briefRef(BRIEF) } };

/** mulberry32 — a small, well-known seeded generator. */
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

test(`${TRIALS} random kills (seed ${SEED}): every wreck is absent, waiting-whole or settled — never partial — and the same keys are safe to retry`, async () => {
  const next = rng(SEED);
  const delays = Array.from({ length: TRIALS }, () => Math.floor(next() * MAX_DELAY_MS));
  const tally = { absent: 0, waiting: 0, settled: 0 };
  const violations: string[] = [];
  let cursor = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const n = cursor++;
      if (n >= TRIALS) return;
      const ts = makeStore();
      try {
        const run = spawnOwner(ts, { script: [OPEN, MOVE, { op: "sleep", ms: 3000 }] });
        await run.started;
        await new Promise((r) => setTimeout(r, delays[n]));
        await killNow(run);
        const wreck = await inspectStore(ts.store, GATE);
        tally[wreck.gate]++;
        const v = checkInvariants(wreck);
        if (v.length) violations.push(`trial ${n} (delay ${delays[n]} ms): ${v.join(",")} ${JSON.stringify(wreck.documents)}`);
        const again = await runThenKill(ts, { script: [OPEN, MOVE, { op: "sleep", ms: 400 }] });
        const [opened, moved] = again.results as [{ status: string }, { status: string }];
        if (!["opened", "repeat"].includes(opened.status) || !["committed", "repeat"].includes(moved.status)) violations.push(`trial ${n}: retry gave ${JSON.stringify([opened, moved])}`);
        const after = await inspectStore(ts.store, GATE);
        const v2 = checkInvariants(after);
        if (v2.length || after.records.length !== 1) violations.push(`trial ${n}: after the retry ${v2.join(",")} records=${after.records.length}`);
      } catch (e) {
        violations.push(`trial ${n}: ${(e as Error).message.slice(0, 200)}`);
      } finally {
        ts.cleanup();
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(`random kills: ${TRIALS} trials, seed ${SEED}, delays 0–${MAX_DELAY_MS} ms after start; wrecks: ${tally.absent} absent, ${tally.waiting} waiting, ${tally.settled} settled`);
  assert.deepEqual(violations, [], violations.slice(0, 5).join("\n"));
  // a run where every kill landed on the same side proves little: the kills must straddle the commit
  assert.ok(tally.settled >= 1, `no kill landed after the move committed (${JSON.stringify(tally)}): widen the delays`);
  assert.ok(tally.absent + tally.waiting >= 1, `no kill landed before the move committed (${JSON.stringify(tally)}): narrow the delays`);
});
