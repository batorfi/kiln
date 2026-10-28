// r15 T041 (US6, PROOF tier): the owner is SIGKILLed at each of the backbone's four points — a batch read, applied inside its commit, committed, delivered-but-cursor-not-moved — while a transactional and an
// effect consumer follow a scripted walk. After the restart finishes the walk, a fresh owner lets the consumers catch up, and a fresh reader judges: the walk equals the uninterrupted one (the record is the
// walk\'s, unaffected by who follows it), E1–E3, E7 clean, and E5 — the transactional consumer applied every event exactly once, the effect consumer delivered every event at least once, no cursor is ahead.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BACKBONE_KILL_POINTS } from "#durable/hooks.ts";
import { runWalk } from "./support/walk-harness.ts";
import { baseline, FEATURE, judge, PLAIN } from "./support/walk-judge.ts";
import { catchUpAndJudge } from "./support/consumer-judge.ts";

test("the backbone\'s four points are declared, and a walk with consumers reaches each of them", async () => {
  assert.equal(BACKBONE_KILL_POINTS.length, 4);
  const run = await runWalk({ feature: FEATURE, walk: PLAIN, countHits: true, owner: { env: { TEST_CONSUMERS: "1" } } });
  try {
    for (const p of BACKBONE_KILL_POINTS) assert.ok((run.hits.get(p) ?? 0) >= 1, `${p} was never reached`);
  } finally { run.cleanup(); }
});

for (const point of BACKBONE_KILL_POINTS) {
  for (const nth of [1, 3]) {
    test(`killed at ${point} (hit ${nth}) with consumers following the walk: the walk equals the uninterrupted one and E5 holds after catch-up`, { timeout: 180_000 }, async () => {
      const owner = { env: { TEST_CONSUMERS: "1" } };
      const base = await baseline("plain+consumers", PLAIN, undefined, owner); // task ids depend on the consumers' commits, so the baseline runs with the same consumers
      const run = await runWalk({ feature: FEATURE, walk: PLAIN, killAt: point, killNth: nth, owner });
      try {
        assert.ok(run.fired.includes(point), `proof-point-not-fired: ${point} (hit ${nth})`);
        await judge(run, PLAIN, base);
        assert.deepEqual(await catchUpAndJudge(run.ts.store), []);
      } finally { run.cleanup(); }
    });
  }
}
